import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { storage } from './lib/storage.js';
import { backfillNameNorm, purgeExpiredTrash, purgeExpiredUploads, sweepOrphanFiles } from './services/drive.js';

async function main() {
  storage.ensureRoot();
  await connectDB();
  void backfillNameNorm()
    .then((n) => n && logger.info({ n }, 'backfilled file name index'))
    .catch((err) => logger.error({ err }, 'backfill nameNorm failed'));

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`FileShare API đang chạy tại http://localhost:${env.PORT}`);
  });

  // Dọn thùng rác và phiên tải dở quá hạn mỗi giờ, quét file mồ côi mỗi ngày
  const purge = () =>
    Promise.all([purgeExpiredTrash(), purgeExpiredUploads()])
      .then(([trash, uploads]) => (trash || uploads) && logger.info({ trash, uploads }, 'purged expired data'))
      .catch((err) => logger.error({ err }, 'purge failed'));
  const sweep = () =>
    sweepOrphanFiles()
      .then((n) => n && logger.info({ n }, 'removed orphan files'))
      .catch((err) => logger.error({ err }, 'orphan sweep failed'));
  const timer = setInterval(purge, 3_600_000);
  const sweepTimer = setInterval(sweep, 86_400_000);
  timer.unref();
  sweepTimer.unref();
  void purge();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} nhận được, đang tắt...`);
    clearInterval(timer);
    clearInterval(sweepTimer);
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
