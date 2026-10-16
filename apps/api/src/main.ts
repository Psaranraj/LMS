import { createApp } from './app/app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening at http://localhost:${env.PORT}/api/v1`);
});
server.on('error', console.error);
