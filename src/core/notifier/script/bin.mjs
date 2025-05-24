import { config } from 'dotenv';
import * as fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const filePath = 'result.json';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getGameType = (emoji) => {
  switch (emoji) {
    case '🗺️':
      return 'MAP';
    case '🇺🇸 🗺️':
      return 'US_MAP';
    case '🏁':
      return 'FLAG';
    case '🏛️':
      return 'CAPITAL';
    default:
      return null;
  }
};

const users = [
  { chatId: 862305226, firstName: 'Matan', lastName: 'Nave', username: 'daninave1' },
  { chatId: 957142342, firstName: 'R', lastName: 'L', username: 'bluesky902' },
  { chatId: 300308003, firstName: 'Jordan', lastName: null, username: 'yard2010' },
  { chatId: 431321716, firstName: 'Aviv', lastName: null, username: null },
  { chatId: 1332013273, firstName: 'Dekel', lastName: null, username: null },
  { chatId: 700639561, firstName: 'Ariel', lastName: 'Bar', username: null },
  { chatId: 293863369, firstName: 'Idan', lastName: 'K', username: 'i_for_example' },
  { chatId: 1305428864, firstName: 'Aliasghar', lastName: 'Dadashi', username: null },
  { chatId: 5005333139, firstName: 'Shahaf', lastName: null, username: null },
  { chatId: 618306815, firstName: 'Liran', lastName: null, username: null },
  { chatId: 6942993883, firstName: 'Tal', lastName: null, username: 'tal56556' },
  { chatId: 6947242426, firstName: 'Jacob', lastName: 'Graham', username: null },
  { chatId: 1504790417, firstName: 'Daniel', lastName: 'Shnayderman', username: null },
  { chatId: 5734895637, firstName: 'yy', lastName: 'Text', username: null },
  { chatId: 1399643739, firstName: 'ירדן', lastName: 'שמואלי', username: null },
];

const messages = JSON.parse(fs.readFileSync(path.join(__dirname, filePath), 'utf8')).messages;
const logs = messages
  .filter((log) => log.from === 'Notifier')
  .filter((log) => log.text.includes('Worldly'))
  .filter((log) => log.text.includes('ANSWERED'))
  .map(({ date, text }) => ({ date, text }));

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    const gameLogCollection = client.db('Worldly').collection('GameLog');

    for (const log of logs) {
      const lines = log.text.split('\n');
      const chatId = users.find((user) => user.firstName === lines[1].split(' ')[1]).chatId; // use lines[1] since contains the name = get the chatId with it
      const dataLine = JSON.parse(lines.slice(3).join('\n').replace('data: ', ''));
      const logRecord = {
        _id: new ObjectId(),
        chatId,
        type: getGameType(dataLine.game) || null,
        correct: dataLine.correct || null,
        selected: dataLine.selected || null,
        createdAt: new Date(log.date),
      };
      await gameLogCollection.insertOne(logRecord);
      console.log('processed record:', logRecord);
    }
    console.log('finished');
  } catch (err) {
    console.error('Error during insertion:', err);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
