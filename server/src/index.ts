import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { storage } from './lib/storage.js';
import { purgeExpiredTrash } from './services/drive.js';

async function main() {
  storage.ensureRoot();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`FileShare API đang chạy tại http://localhost:${env.PORT}`);
  });

  // Dọn thùng rác quá hạn mỗi giờ
  const purge = () =>
    purgeExpiredTrash()
      .then((n) => n && logger.info({ n }, 'purged expired trash'))
      .catch((err) => logger.error({ err }, 'purge failed'));
  const timer = setInterval(purge, 3_600_000);
  timer.unref();
  void purge();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} nhận được, đang tắt...`);
    clearInterval(timer);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Không thể khởi động server');
  process.exit(1);
});
