// Free, no-browser, no-API-key Twitter/X scraper — latest posts of any public user.
//
// Two independent strategies, tried in order:
//   1. "graphql" — X's own anonymous web flow: public bearer token -> guest token
//      -> GraphQL UserByScreenName + UserTweets. Rich data (metrics, views).
//   2. "nitter"  — RSS feeds from live Nitter instances. Survives X GraphQL
//      changes; used automatically when strategy 1 fails.
import https from 'node:https';
import { FETCH_TIMEOUT_MS, NITTER_INSTANCES, OP, PUBLIC_BEARER, USER_AGENT, USER_BY_SCREEN_NAME_FEATURES, USER_TWEETS_FEATURES } from './constants';
import type { FetchLatestPostsOptions, LatestPostsResult, ScrapedTweet, ScrapedUser } from './types';

async function timedFetch(url: string | URL, options: { method?: string; headers?: Record<string, string> } = {}): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// ---------------------------------------------------------------------------
// Strategy 1 — X anonymous GraphQL (guest token)
// ---------------------------------------------------------------------------

let cachedGuestToken: string | null = null;

async function getGuestToken(force = false): Promise<string> {
  if (cachedGuestToken && !force) return cachedGuestToken;
  const res = await timedFetch('https://api.twitter.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PUBLIC_BEARER}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`guest/activate failed: HTTP ${res.status}`);
  const json: any = await res.json();
  if (!json.guest_token) throw new Error('guest/activate returned no token');
  cachedGuestToken = json.guest_token;
  return cachedGuestToken;
}

async function graphql(opId: string, opName: string, variables: Record<string, any>, features: Record<string, boolean>): Promise<any> {
  const url = new URL(`https://api.twitter.com/graphql/${opId}/${opName}`);
  url.searchParams.set('variables', JSON.stringify(variables));
  url.searchParams.set('features', JSON.stringify(features));

  // Retry once with a fresh guest token on auth/rate-limit responses.
  for (let attempt = 0; attempt < 2; attempt++) {
    const guestToken = await getGuestToken(attempt > 0);
    const res = await timedFetch(url, {
      headers: {
        Authorization: `Bearer ${PUBLIC_BEARER}`,
        'x-guest-token': guestToken,
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
    });
    if ([401, 403, 429].includes(res.status)) {
      cachedGuestToken = null;
      continue;
    }
    if (!res.ok) throw new Error(`${opName} failed: HTTP ${res.status}`);
    const json: any = await res.json();
    if (json.errors?.length && !json.data) throw new Error(`${opName} error: ${json.errors[0].message}`);
    return json;
  }
  throw new Error(`${opName} failed after retry (rate limited?)`);
}

async function getUserId(username: string): Promise<{ restId: string; name: string; username: string }> {
  const json = await graphql(OP.UserByScreenName, 'UserByScreenName', { screen_name: username }, USER_BY_SCREEN_NAME_FEATURES);
  const result = json?.data?.user?.result;
  if (!result?.rest_id) throw new Error(`user @${username} not found`);
  return { restId: result.rest_id, name: result.legacy?.name ?? username, username };
}

function readTweetResult(result: any): ScrapedTweet | null {
  if (!result) return null;
  const tweet = result.__typename === 'TweetWithVisibilityResults' ? result.tweet : result;
  const legacy = tweet?.legacy;
  if (!legacy) return null;

  const user = tweet.core?.user_results?.result?.legacy;
  const noteText = tweet.note_tweet?.note_tweet_results?.result?.text; // long-form tweets

  return {
    id: legacy.id_str,
    text: (noteText ?? legacy.full_text ?? '').trim(),
    createdAt: new Date(legacy.created_at).toISOString(),
    url: user?.screen_name ? `https://x.com/${user.screen_name}/status/${legacy.id_str}` : null,
    author: user?.screen_name ?? null,
    isRetweet: Boolean(legacy.retweeted_status_result) || Boolean(legacy.full_text?.startsWith('RT @')),
    isReply: Boolean(legacy.in_reply_to_status_id_str),
    metrics: {
      likes: legacy.favorite_count ?? 0,
      retweets: legacy.retweet_count ?? 0,
      replies: legacy.reply_count ?? 0,
      views: Number(tweet.views?.count ?? 0),
    },
  };
}

function extractTweets(instructions: any[]): ScrapedTweet[] {
  const tweets: ScrapedTweet[] = [];
  for (const instruction of instructions) {
    const entries = instruction.entries ?? (instruction.entry ? [instruction.entry] : []);
    for (const entry of entries) {
      const content = entry.content;
      if (!content) continue;
      if (content.entryType === 'TimelineTimelineItem') {
        const tweet = readTweetResult(content.itemContent?.tweet_results?.result);
        if (tweet) tweets.push(tweet);
      }
      if (content.entryType === 'TimelineTimelineModule' && Array.isArray(content.items)) {
        for (const item of content.items) {
          const tweet = readTweetResult(item.item?.itemContent?.tweet_results?.result);
          if (tweet) tweets.push(tweet);
        }
      }
    }
  }
  return tweets;
}

async function fetchViaGraphql(username: string): Promise<{ user: ScrapedUser; tweets: ScrapedTweet[]; source: string }> {
  const user = await getUserId(username);
  const variables = {
    userId: user.restId,
    count: 40, // over-fetch so filters + pinned-tweet dedup still leave enough
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: false,
    withVoice: false,
    withV2Timeline: true,
  };
  const json = await graphql(OP.UserTweets, 'UserTweets', variables, USER_TWEETS_FEATURES);
  const instructions = json?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];
  const tweets = extractTweets(instructions).filter((t) => !t.author || t.author.toLowerCase() === username.toLowerCase() || t.isRetweet);
  if (tweets.length === 0) throw new Error('GraphQL returned no tweets (protected account or empty timeline?)');
  return { user: { name: user.name, username: user.username }, tweets, source: 'graphql' };
}

// ---------------------------------------------------------------------------
// Strategy 2 — Nitter RSS fallback
// ---------------------------------------------------------------------------

// Some instances fingerprint undici (Node's fetch) and serve an empty body,
// while plain node:https gets the real response — so this path avoids fetch.
function httpsGetText(url: string, redirectsLeft = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' }, timeout: FETCH_TIMEOUT_MS }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        resolve(httpsGetText(new URL(res.headers.location, url).href, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripHtml(html: string): string {
  return decodeXml(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? match[1] : '';
}

function parseNitterRss(xml: string, username: string): { name: string; tweets: ScrapedTweet[] } {
  const channelTitle = decodeXml(tag(xml.split('<item>')[0], 'title')); // "Name / @user"
  const name = channelTitle.split('/')[0]?.trim() || username;

  const items = xml.split('<item>').slice(1);
  const tweets = items.map((block) => {
    const link = tag(block, 'link'); // https://<instance>/<user>/status/<id>#m
    const id = link.match(/status\/(\d+)/)?.[1] ?? '';
    const creator = tag(block, 'dc:creator').replace(/^@/, '');
    const title = decodeXml(tag(block, 'title'));
    const description = stripHtml(tag(block, 'description'));
    return {
      id,
      text: description || title,
      createdAt: new Date(tag(block, 'pubDate')).toISOString(),
      url: id ? `https://x.com/${creator || username}/status/${id}` : null,
      author: creator || username,
      isRetweet: title.startsWith('RT by '),
      isReply: title.startsWith('R to '),
      metrics: null, // RSS carries no engagement metrics
    };
  });
  return { name, tweets };
}

async function fetchViaNitter(username: string): Promise<{ user: ScrapedUser; tweets: ScrapedTweet[]; source: string }> {
  const errors: string[] = [];
  for (const instance of NITTER_INSTANCES) {
    try {
      const xml = await httpsGetText(`${instance}/${username}/rss`);
      if (!xml.includes('<item>')) throw new Error('no items in feed');
      const { name, tweets } = parseNitterRss(xml, username);
      if (tweets.length === 0) throw new Error('parsed 0 tweets');
      return { user: { name, username }, tweets, source: `nitter (${new URL(instance).host})` };
    } catch (err) {
      errors.push(`${new URL(instance).host}: ${err.message}`);
    }
  }
  throw new Error(`all nitter instances failed — ${errors.join(' | ')}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchLatestPosts(username: string, options: FetchLatestPostsOptions = {}): Promise<LatestPostsResult> {
  const { count = 5, includeRetweets = true, includeReplies = true, source = 'auto' } = options;
  const clean = username.replace(/^@/, '').trim();
  const strategies = source === 'nitter' ? [fetchViaNitter] : source === 'graphql' ? [fetchViaGraphql] : [fetchViaGraphql, fetchViaNitter];

  const errors: string[] = [];
  for (const strategy of strategies) {
    try {
      const { user, tweets, source: usedSource } = await strategy(clean);
      const seen = new Set<string>();
      const filtered = tweets
        .filter((t) => t.id && !seen.has(t.id) && seen.add(t.id))
        .filter((t) => (includeRetweets || !t.isRetweet) && (includeReplies || !t.isReply))
        .sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1)) // ids are chronological; avoids pinned-tweet ordering issues
        .slice(0, count);
      return { user, source: usedSource, tweets: filtered };
    } catch (err) {
      errors.push(`${strategy.name}: ${err.message}`);
    }
  }
  throw new Error(errors.join(' || '));
}
