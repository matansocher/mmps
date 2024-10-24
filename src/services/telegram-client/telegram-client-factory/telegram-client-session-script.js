const input = require('input');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

// to get apiId and apiHash values, go here - https://my.telegram.org/auth
// run the script and then get the stringSession value
const apiId = 0; // Replace with your api_id
const apiHash = ''; // Replace with your api_hash
const stringSession = ''; // Replace with your saved session string

async function createSession() {
  console.log('Loading interactive example...');
  const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => await input.text('Please enter your number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () => await input.text('Please enter the code you received: '),
    onError: (err) => console.log(err),
  });

  console.log('Your session string: ', client.session.save());
}

createSession();
