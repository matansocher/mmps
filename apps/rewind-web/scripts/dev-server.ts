import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { argv } from 'node:process';
import { initRewind } from '../../../src/features/rewind';

const port = Number(argv[2] ?? 5276);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Provide a valid Rewind API port');
const app = express();
initRewind(app);
const server = createServer(app);
server.listen(port, '127.0.0.1', () => console.log(`Rewind-only server: http://127.0.0.1:${port}/rewind/`));
