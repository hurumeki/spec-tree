import { openDatabase } from './db/index.js';
import { buildApp } from './server.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';

const db = openDatabase();
const app = await buildApp(db, { logger: true });

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  db.close();
  process.exit(1);
}

const shutdown = async (): Promise<void> => {
  await app.close();
  db.close();
};
process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0));
});
