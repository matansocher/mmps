// Usage: npx tsx src/services/twitter-scraper/scripts/get-user-tweets.ts <username...> [--count 5] [--no-replies] [--no-retweets] [--watch <minutes>]
// Free, no API key: uses this twitter-scraper service (X anonymous guest-token GraphQL, falls back to Nitter RSS).
// Some public accounts are hidden from logged-out visitors — set X_AUTH_TOKEN + X_CT0 (your x.com cookies) in .env for those.
// Examples:
//   npx tsx src/services/twitter-scraper/scripts/get-user-tweets.ts elonmusk @nasa --count 3
//   npx tsx src/services/twitter-scraper/scripts/get-user-tweets.ts elonmusk nasa --no-replies --watch 15   # prints only new tweets every 15 minutes
import 'dotenv/config';
import { fetchLatestPosts } from '..';
import type { ScrapedTweet } from '..';

type Options = {
  readonly usernames: string[];
  readonly count: number;
  readonly includeReplies: boolean;
  readonly includeRetweets: boolean;
  readonly watchMinutes: number | null;
};

function parseArgs(args: string[]): Options {
  const usernames: string[] = [];
  let count = 5;
  let includeReplies = true;
  let includeRetweets = true;
  let watchMinutes: number | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--count') count = Number(args[++i]);
    else if (arg === '--watch') watchMinutes = Number(args[++i]);
    else if (arg === '--no-replies') includeReplies = false;
    else if (arg === '--no-retweets') includeRetweets = false;
    else usernames.push(arg.replace(/^@/, ''));
  }

  if (!usernames.length) throw new Error('Usage: npx tsx src/services/twitter-scraper/scripts/get-user-tweets.ts <username...> [--count 5] [--no-replies] [--no-retweets] [--watch <minutes>]');
  if (!Number.isInteger(count) || count < 1) throw new Error('--count must be a positive integer');
  if (watchMinutes !== null && !(watchMinutes > 0)) throw new Error('--watch must be a positive number of minutes');

  return { usernames, count, includeReplies, includeRetweets, watchMinutes };
}

function printTweet(tweet: ScrapedTweet): void {
  const tags = [tweet.isRetweet && 'RT', tweet.isReply && 'reply'].filter(Boolean).join(', ');
  console.log(`  [${tweet.createdAt}]${tags ? ` (${tags})` : ''} ${tweet.text.replace(/\s+/g, ' ')}`);
  if (tweet.url) console.log(`    ${tweet.url}`);
}

// Tweet ids are chronological snowflakes, so "newer" = bigger id.
async function checkUser(username: string, options: Options, lastSeen: Map<string, string>): Promise<void> {
  try {
    const { user, source, tweets } = await fetchLatestPosts(username, { count: options.count, includeReplies: options.includeReplies, includeRetweets: options.includeRetweets });
    const previousId = lastSeen.get(username);
    const fresh = previousId ? tweets.filter((t) => BigInt(t.id) > BigInt(previousId)) : tweets;
    if (tweets.length) lastSeen.set(username, tweets[0].id);
    if (!fresh.length) return;

    console.log(`\n@${user.username} (${user.name}) — via ${source}`);
    fresh.forEach(printTweet);
  } catch (err) {
    console.error(`\n@${username}: failed — ${err instanceof Error ? err.message : err}`);
  }
}

async function main(): Promise<void> {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const lastSeen = new Map<string, string>();
  const runOnce = async () => {
    for (const username of options.usernames) await checkUser(username, options, lastSeen);
  };

  await runOnce();
  if (options.watchMinutes === null) return;

  console.log(`\nWatching for new tweets every ${options.watchMinutes} min (Ctrl+C to stop)...`);
  setInterval(runOnce, options.watchMinutes * 60 * 1000);
}

main();
