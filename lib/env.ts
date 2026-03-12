export const env = {
  databaseUrl: process.env.DATABASE_URL,
  adminKey: process.env.ADMIN_KEY ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID ?? "",
  nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  webappUrl: process.env.WEBAPP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "",
  uploadsDir: process.env.UPLOADS_DIR ?? "./uploads",
  maxUploadSizeMb: 20
};
