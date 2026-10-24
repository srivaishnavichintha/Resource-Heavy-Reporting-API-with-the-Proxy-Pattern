import { createApp } from './app';

const port = Number(process.env.PORT) || 8080;
const app = createApp();

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Reporting API listening on port ${port}`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
