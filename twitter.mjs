import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

const twitterClient = new TwitterApi('AAAAAAAAAAAAAAAAAAAAABM1vgEAAAAAXM1jgnGsQl5QZGEgaUyOPwnShJU%3DzXHwJtksjbzOnN1J4SMDucxs3VtmbnY5gRMMOgIHaDI3nVWhhL');

async function getUserDataAndTweets(username) {
  try {
    // Step 1: Get user details
    const user = await twitterClient.v2.userByUsername(username);
    if (!user?.data?.id) {
      console.error(`User "${username}" not found.`);
      return;
    }

    console.log('User Details:');
    console.log(user.data);

    // Step 2: Get latest tweets
    const tweets = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: 5,
      'tweet.fields': ['created_at', 'public_metrics'],
      exclude: ['retweets', 'replies'], // Optional
    });

    console.log('\nLatest Tweets:');
    for (const tweet of tweets.data.data || []) {
      console.log(`- ${tweet.text} (created at ${tweet.created_at})`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

await getUserDataAndTweets('yaronavraham');
