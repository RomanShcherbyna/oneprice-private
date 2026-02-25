import { env } from "@/lib/env";

export async function notifyAdminNewComment(params: {
  propertyId: string;
  propertyTitle: string;
  authorName: string;
  text?: string | null;
  attachmentsCount: number;
}): Promise<void> {
  if (!env.telegramBotToken || !env.adminTelegramId) {
    return;
  }

  const textPart = params.text ? `\nТекст: ${params.text}` : "";
  const objectUrl = `${env.nextPublicAppUrl}/property/${params.propertyId}`;
  const message = [
    "Новый комментарий клиента",
    `Объект: ${params.propertyTitle}`,
    `Клиент: ${params.authorName}`,
    `Вложений: ${params.attachmentsCount}${textPart}`,
    `Ссылка: ${objectUrl}`
  ].join("\n");

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId: "admin-notify",
      hypothesisId: "H37",
      location: "lib/telegram.ts:24",
      message: "Попытка отправить уведомление админу",
      data: {
        hasToken: Boolean(env.telegramBotToken),
        hasAdminId: Boolean(env.adminTelegramId),
        attachmentsCount: params.attachmentsCount
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: env.adminTelegramId,
      text: message
    })
  });

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId: "admin-notify",
      hypothesisId: "H38",
      location: "lib/telegram.ts:57",
      message: "Ответ Telegram API на уведомление",
      data: {
        ok: response.ok,
        status: response.status
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
}
