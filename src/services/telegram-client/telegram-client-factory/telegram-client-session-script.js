import input from 'input';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const apiId = 26051877; // Replace with your api_id
const apiHash = 'c5079f3c85c8ecc85673d2be51a5fd83'; // Replace with your api_hash
const stringSession = '1BAAOMTQ5LjE1NC4xNjcuOTEAUDWzrxncs6qOHtH8wkUqoh84F6WFECsSi4jm8YG/xursHVa8bru3ZOxkHeRkvOtQVKRhAEO9O05v8EbhB+l22iimr4jGjDH/67F+ZTXd2b8rsuWWa6Lf6p/6UJ50q07yrsa21y+vO3jVm6wjg0f11n/c2CxkKK/NluFbr2shhkHQurK1+ywertVRfJ41UUbbmrXtxREw28P62412r3lwt7vt3hFbuigOPxUq6qvBPNNjAhEkf5bMkdCr6zePIRSpqJNWzXeTHjBsPiSJxh0ibj9OfvO5McG93RlNDx+OHGaOTROYqsg20R8N39zoGHYZWCXsQzY4ezx8w04HHl8SisA='; // Replace with your saved session string

console.log('Loading interactive example...');
const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries: 5 });

await client.start({
  phoneNumber: async () => await input.text('Please enter your number: '),
  password: async () => await input.text('Please enter your password: '),
  phoneCode: async () => await input.text('Please enter the code you received: '),
  onError: (err) => console.log(err),
});

console.log('Your session string: ', client.session.save());
