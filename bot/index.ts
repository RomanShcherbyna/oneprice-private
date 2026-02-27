import { Telegraf, Markup } from "telegraf";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
const adminKey = process.env.ADMIN_KEY;
const debugEndpoint = "http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca";

type WizardStep =
  | "city"
  | "address"
  | "areaM2"
  | "monthlyTotal"
  | "rentRate"
  | "serviceRate"
  | "description"
  | "photos";

type WizardState = {
  step: WizardStep;
  data: {
    kind: "warehouse" | "premise";
    city: string;
    address: string;
    areaM2: number;
    monthlyTotal: number;
    rentRate: number;
    serviceRate: number;
    description: string;
    photoFileIds: string[];
  };
};

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

if (!webAppUrl) {
  throw new Error("WEBAPP_URL is required");
}

if (!adminTelegramId) {
  throw new Error("ADMIN_TELEGRAM_ID is required");
}

if (!adminKey) {
  throw new Error("ADMIN_KEY is required");
}

const bot = new Telegraf(botToken);
const normalizedAppUrl = webAppUrl.endsWith("/") ? webAppUrl.slice(0, -1) : webAppUrl;
const adminUrl = `${normalizedAppUrl}/admin`;
const wizardByAdmin = new Map<number, WizardState>();
const consentByUser = new Set<number>();
const approvedUsers = new Set<number>([Number(adminTelegramId)]);
const pendingAccessRequests = new Map<
  number,
  { firstName: string; username: string; requestedAt: number; role: "admin" | "client" }
>();

function debugLog(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  fetch(debugEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
}

function parseNumber(input: string): number | null {
  const normalized = input.replace(",", ".").replace(/\s+/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

function wizardPrompt(step: WizardStep): string {
  if (step === "city") return "Введите Город:";
  if (step === "address") return "Введите Адрес:";
  if (step === "areaM2") return "Введите Метраж (число):";
  if (step === "monthlyTotal") return "Введите Цена (число):";
  if (step === "rentRate") return "Введите Цена м2 (число):";
  if (step === "serviceRate") return "Введите Сервис чардж (число):";
  if (step === "description") return "Введите Описание:";
  return "Пришлите фото объекта (1..N). Когда закончите — отправьте: Готово";
}

function nextStep(step: WizardStep): WizardStep | null {
  if (step === "city") return "address";
  if (step === "address") return "areaM2";
  if (step === "areaM2") return "monthlyTotal";
  if (step === "monthlyTotal") return "rentRate";
  if (step === "rentRate") return "serviceRate";
  if (step === "serviceRate") return "description";
  if (step === "description") return "photos";
  return null;
}

type ParsedPropertyBlock = {
  city: string;
  address: string;
  areaM2: number;
  monthlyTotal: number;
  rentRate: number;
  serviceRate: number;
  description: string;
};

function parsePropertyBlock(text: string): ParsedPropertyBlock | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const map: Record<string, string> = {};
  let descriptionIndex = -1;

  function normalizeKey(input: string): string {
    return input
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/ё/g, "е")
      .replace("м²", "м2")
      .trim();
  }

  function extractNumber(input: string): number | null {
    const normalized = input.replace(",", ".");
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function pickValue(keys: string[]): string | null {
    for (const key of keys) {
      if (map[key]) return map[key];
    }
    return null;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const sepIndex = line.indexOf(":");
    if (sepIndex <= 0) continue;
    const key = normalizeKey(line.slice(0, sepIndex));
    const value = line.slice(sepIndex + 1).trim();
    map[key] = value;
    if (key.includes("описание")) {
      descriptionIndex = i;
    }
  }

  const city = pickValue(["город"]);
  const address = pickValue(["адрес"]);
  const areaRaw = pickValue(["метраж", "площадь", "площадь м2", "метраж м2"]);
  const totalRaw = pickValue(["цена", "итог", "итог мес", "итог в месяц"]);
  const rateRaw = pickValue(["цена м2", "цена за м2", "ставка", "ставка м2"]);
  const serviceRaw = pickValue(["сервис чардж", "service charge", "сервис"]);

  if (!city || !address || !areaRaw || !totalRaw || !rateRaw || !serviceRaw) {
    // #region agent log
    debugLog("bot-admin-create", "H21", "bot/index.ts:170", "Блок нераспознан: не хватает обязательных полей", {
      hasCity: Boolean(city),
      hasAddress: Boolean(address),
      hasAreaRaw: Boolean(areaRaw),
      hasTotalRaw: Boolean(totalRaw),
      hasRateRaw: Boolean(rateRaw),
      hasServiceRaw: Boolean(serviceRaw)
    });
    // #endregion
    return null;
  }

  const areaM2 = extractNumber(areaRaw);
  const monthlyTotal = extractNumber(totalRaw);
  const rentRate = extractNumber(rateRaw);
  const serviceRate = extractNumber(serviceRaw);

  if (areaM2 == null || monthlyTotal == null || rentRate == null || serviceRate == null) {
    // #region agent log
    debugLog("bot-admin-create", "H22", "bot/index.ts:189", "Блок нераспознан: числовые поля невалидны", {
      areaRaw,
      totalRaw,
      rateRaw,
      serviceRaw,
      areaParsed: areaM2,
      totalParsed: monthlyTotal,
      rateParsed: rentRate,
      serviceParsed: serviceRate
    });
    // #endregion
    return null;
  }

  const descriptionLine =
    pickValue(["описание", "описание помещения", "комментарии", "комментарий"]) || "";
  let description = descriptionLine;
  if (descriptionIndex >= 0 && descriptionIndex < lines.length - 1) {
    const tail = lines.slice(descriptionIndex + 1).join("\n").trim();
    if (tail) {
      description = description ? `${description}\n${tail}` : tail;
    }
  }

  return {
    city,
    address,
    areaM2,
    monthlyTotal,
    rentRate,
    serviceRate,
    description: description || "Без описания"
  };
}

function detectKindHint(text: string): "warehouse" | "premise" {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .find(Boolean) || "";
  return firstLine.startsWith("склад") ? "warehouse" : "premise";
}

function openLinksText(isAdmin: boolean): string {
  if (isAdmin) {
    return [
      "Ссылки для открытия в браузере:",
      `Клиент: ${normalizedAppUrl}`,
      `Админка: ${adminUrl}`,
      "",
      "Команды администратора:",
      "/add_property — добавить объект через чат",
      "/cancel — отменить мастер создания"
    ].join("\n");
  }
  return ["Ссылка для открытия в браузере:", `Клиент: ${normalizedAppUrl}`].join("\n");
}

function buildMainKeyboard(ctx: { from: { id: number; username?: string; first_name?: string } }, isAdmin: boolean) {
  const clientUrl = buildClientUrlWithUser(ctx);
  const adminClientUrl = buildAdminUrlWithUser(ctx);
  const canUseWebAppButtons = clientUrl.startsWith("https://");

  if (isAdmin) {
    if (canUseWebAppButtons) {
      return Markup.keyboard([
        [Markup.button.webApp("Открыть клиент", clientUrl), Markup.button.webApp("Открыть админку", adminClientUrl)],
        ["Показать ссылки"]
      ]).resize();
    }
    return Markup.keyboard([["Открыть клиент", "Открыть админку"], ["Показать ссылки"]]).resize();
  }

  if (canUseWebAppButtons) {
    return Markup.keyboard([[Markup.button.webApp("Открыть клиент", clientUrl)], ["Показать ссылки"]]).resize();
  }
  return Markup.keyboard([["Открыть клиент"], ["Показать ссылки"]]).resize();
}

function resolveTelegramName(ctx: { from: { id: number; username?: string; first_name?: string } }): string {
  return (ctx.from.username || ctx.from.first_name || `user_${ctx.from.id}`).trim();
}

function buildClientUrlWithUser(ctx: { from: { id: number; username?: string; first_name?: string } }): string {
  const params = new URLSearchParams({
    telegramUserId: String(ctx.from.id),
    telegramUsername: resolveTelegramName(ctx)
  });
  return `${normalizedAppUrl}/?${params.toString()}`;
}

function buildAdminUrlWithUser(ctx: { from: { id: number; username?: string; first_name?: string } }): string {
  const params = new URLSearchParams({
    telegramUserId: String(ctx.from.id),
    telegramUsername: resolveTelegramName(ctx)
  });
  return `${adminUrl}?${params.toString()}`;
}

function accessRequestText(
  from: { id: number; username?: string; first_name?: string },
  role: "admin" | "client"
): string {
  const firstName = from.first_name || "-";
  const username = from.username ? `@${from.username}` : "-";
  return [
    "Запрос доступа к боту",
    `ID: ${from.id}`,
    `Имя: ${firstName}`,
    `Username: ${username}`,
    `Роль: ${role}`
  ].join("\n");
}

bot.start(async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  const hello = `Здравствуйте, ${resolveTelegramName(ctx)}.`;
  const isApproved = approvedUsers.has(ctx.from.id);

  try {
    // #region agent log
    debugLog("bot-admin-open", "H1", "bot/index.ts:129", "Команда /start обработана", {
      fromId: ctx.from.id,
      isAdmin,
      adminTelegramId: Number(adminTelegramId),
      isApproved
    });
    // #endregion

    if (!isApproved) {
      await ctx.reply(
        `${hello}\n\nЧтобы продолжить, отправьте запрос администратору.`,
        Markup.inlineKeyboard([Markup.button.callback("Запросить доступ у администратора", "access_request")])
      );
      return;
    }

    await ctx.reply(`${hello}\n\nПодтвердите согласие на передачу имени в Mini App.`, Markup.keyboard([["Согласен ✅"]]).resize());
  } catch (error) {
    throw error;
  }
});

bot.hears("Согласен ✅", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  if (!approvedUsers.has(ctx.from.id)) {
    await ctx.reply("Доступ еще не одобрен. Нажмите 'Запросить доступ у администратора' в /start.");
    return;
  }
  consentByUser.add(ctx.from.id);

  // #region agent log
  debugLog("bot-consent", "H31", "bot/index.ts:284", "Пользователь подтвердил согласие", {
    fromId: ctx.from.id,
    isAdmin
  });
  // #endregion

  await ctx.reply(
    openLinksText(isAdmin),
    buildMainKeyboard(ctx, isAdmin)
  );

  const clientUrl = buildClientUrlWithUser(ctx);
  // #region agent log
  debugLog("bot-open-client", "H48", "bot/index.ts:321", "Авто-отправка клиентской ссылки после согласия", {
    fromId: ctx.from.id,
    isAdmin,
    url: clientUrl
  });
  // #endregion
  await ctx.reply(`Открыть клиент: ${clientUrl}`);
});

bot.command("menu", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  await ctx.reply(openLinksText(isAdmin));
});

bot.command("cancel", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  if (!isAdmin) return;
  wizardByAdmin.delete(ctx.from.id);
  await ctx.reply("Создание объекта отменено.");
});

bot.command("add_property", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  if (!isAdmin) {
    await ctx.reply("Команда доступна только администратору.");
    return;
  }

  wizardByAdmin.set(ctx.from.id, {
    step: "city",
    data: {
      kind: "premise",
      city: "",
      address: "",
      areaM2: 0,
      monthlyTotal: 0,
      rentRate: 0,
      serviceRate: 0,
      description: "",
      photoFileIds: []
    }
  });

  // #region agent log
  debugLog("bot-admin-create", "H1", "bot/index.ts:149", "Старт мастера создания объекта", {
    adminId: ctx.from.id
  });
  // #endregion

  await ctx.reply(
    "Город: \nАдрес: \nМетраж: \nЦена: \nЦена м2: \nСервис чардж: \nОписание: "
  );
});

bot.hears("Показать ссылки", async (ctx) => {
  if (!approvedUsers.has(ctx.from.id)) {
    await ctx.reply("Доступ еще не одобрен. Нажмите /start и запросите доступ.");
    return;
  }
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  await ctx.reply(openLinksText(isAdmin));
});

bot.hears("Открыть клиент", async (ctx) => {
  if (!approvedUsers.has(ctx.from.id)) {
    // #region agent log
    debugLog("bot-open-client", "H45", "bot/index.ts:398", "Блок: доступ не одобрен", {
      fromId: ctx.from.id
    });
    // #endregion
    await ctx.reply("Доступ еще не одобрен. Нажмите /start и запросите доступ.");
    return;
  }
  if (!consentByUser.has(ctx.from.id)) {
    // #region agent log
    debugLog("bot-open-client", "H46", "bot/index.ts:406", "Блок: нет согласия пользователя", {
      fromId: ctx.from.id
    });
    // #endregion
    await ctx.reply("Сначала подтвердите согласие кнопкой 'Согласен ✅'.");
    return;
  }
  const clientUrl = buildClientUrlWithUser(ctx);
  // #region agent log
  debugLog("bot-open-client", "H47", "bot/index.ts:414", "Отправлена ссылка на клиент", {
    fromId: ctx.from.id,
    url: clientUrl
  });
  // #endregion
  await ctx.reply(`Открыть клиент: ${clientUrl}`);
});

bot.hears("Открыть админку", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  if (!approvedUsers.has(ctx.from.id)) {
    await ctx.reply("Доступ еще не одобрен. Нажмите /start и запросите доступ.");
    return;
  }
  // #region agent log
  debugLog("bot-admin-open", "H2", "bot/index.ts:206", "Получен текст Открыть админку", {
    fromId: ctx.from.id,
    isAdmin,
    adminUrl
  });
  // #endregion

  if (!isAdmin) {
    await ctx.reply("Доступ к админке только для администратора.");
    return;
  }
  if (!consentByUser.has(ctx.from.id)) {
    await ctx.reply("Сначала подтвердите согласие кнопкой 'Согласен ✅'.");
    return;
  }
  try {
    await ctx.reply(`Открыть админку: ${buildAdminUrlWithUser(ctx)}`);
    // #region agent log
    debugLog("bot-admin-open", "H3", "bot/index.ts:219", "Ссылка админки отправлена", {
      fromId: ctx.from.id,
      adminUrl
    });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog("bot-admin-open", "H4", "bot/index.ts:227", "Ошибка отправки ссылки админки", {
      fromId: ctx.from.id,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    // #endregion
    throw error;
  }
});

bot.action("access_request", async (ctx) => {
  const from = ctx.from;
  const isAdmin = from.id === Number(adminTelegramId);
  const role: "admin" | "client" = isAdmin ? "admin" : "client";

  if (approvedUsers.has(from.id)) {
    await ctx.answerCbQuery("Доступ уже одобрен");
    return;
  }
  if (pendingAccessRequests.has(from.id)) {
    await ctx.answerCbQuery("Запрос уже отправлен, ожидайте решения");
    return;
  }

  pendingAccessRequests.set(from.id, {
    firstName: from.first_name || "",
    username: from.username || "",
    requestedAt: Date.now(),
    role
  });

  // #region agent log
  debugLog("access-approval", "H33", "bot/index.ts:340", "Пользователь запросил доступ", {
    requesterId: from.id,
    role
  });
  // #endregion

  await bot.telegram.sendMessage(
    Number(adminTelegramId),
    accessRequestText(from, role),
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Одобрить", `access_approve_${from.id}`),
        Markup.button.callback("Отклонить", `access_deny_${from.id}`)
      ]
    ])
  );

  await ctx.answerCbQuery("Запрос отправлен администратору");
  await ctx.editMessageText("Запрос отправлен администратору. Ожидайте решение.");
});

bot.action(/^access_(approve|deny)_(\d+)$/, async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  if (!isAdmin) {
    await ctx.answerCbQuery("Только администратор может принимать решения");
    return;
  }

  const data = "data" in ctx.callbackQuery ? ctx.callbackQuery.data : "";
  const match = data.match(/^access_(approve|deny)_(\d+)$/);
  if (!match) {
    await ctx.answerCbQuery("Некорректный формат запроса");
    return;
  }
  const action = match[1];
  const targetId = Number(match[2]);
  const pending = pendingAccessRequests.get(targetId);
  if (!pending) {
    await ctx.answerCbQuery("Запрос уже обработан");
    return;
  }

  pendingAccessRequests.delete(targetId);

  if (action === "approve") {
    approvedUsers.add(targetId);
    // #region agent log
    debugLog("access-approval", "H34", "bot/index.ts:398", "Админ одобрил доступ", {
      targetId,
      role: pending.role
    });
    // #endregion
    await bot.telegram.sendMessage(targetId, "Доступ одобрен. Отправьте /start.");
    await ctx.answerCbQuery("Доступ одобрен");
    await ctx.editMessageText(
      `Решение: одобрено\nID: ${targetId}\nИмя: ${pending.firstName || "-"}\nРоль: ${pending.role}`
    );
    return;
  }

  // #region agent log
  debugLog("access-approval", "H34", "bot/index.ts:417", "Админ отклонил доступ", {
    targetId,
    role: pending.role
  });
  // #endregion
  approvedUsers.delete(targetId);
  consentByUser.delete(targetId);
  await bot.telegram.sendMessage(targetId, "Доступ отклонен администратором.");
  await ctx.answerCbQuery("Доступ отклонен");
  await ctx.editMessageText(
    `Решение: отклонено\nID: ${targetId}\nИмя: ${pending.firstName || "-"}\nРоль: ${pending.role}`
  );
});

bot.on("photo", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);
  if (!isAdmin) return;

  const wizard = wizardByAdmin.get(ctx.from.id);
  if (!wizard || wizard.step !== "photos") return;

  const largest = ctx.message.photo[ctx.message.photo.length - 1];
  if (!largest) return;
  wizard.data.photoFileIds.push(largest.file_id);

  // #region agent log
  debugLog("bot-admin-create", "H4", "bot/index.ts:186", "Фото добавлено в мастер", {
    adminId: ctx.from.id,
    count: wizard.data.photoFileIds.length
  });
  // #endregion

  await ctx.reply(
    `Фото принято (${wizard.data.photoFileIds.length}). Отправьте еще фото или напишите "Готово".`
  );
});

bot.on("text", async (ctx) => {
  const isAdmin = ctx.from.id === Number(adminTelegramId);

  // #region agent log
  debugLog("bot-admin-create", "H19", "bot/index.ts:360", "Получено текстовое сообщение в боте", {
    fromId: ctx.from.id,
    isAdmin,
    textLength: (ctx.message.text || "").length
  });
  // #endregion

  if (!isAdmin) return;
  if ((ctx.message.text || "").startsWith("/")) return;

  const wizard = wizardByAdmin.get(ctx.from.id);
  if (!wizard) {
    // #region agent log
    debugLog("bot-admin-create", "H20", "bot/index.ts:371", "Текст без активного мастера", {
      fromId: ctx.from.id
    });
    // #endregion
    await ctx.reply('Нет активного мастера. Отправьте /add_property и затем блок данных.');
    return;
  }
  const text = ctx.message.text.trim();

  // #region agent log
  debugLog("bot-admin-create", "H2", "bot/index.ts:206", "Ввод шага мастера", {
    adminId: ctx.from.id,
    step: wizard.step
  });
  // #endregion

  if (wizard.step === "photos" && /^готово$/i.test(text)) {
    try {
      const location = `${wizard.data.city}, ${wizard.data.address}`;
      const kindHint = wizard.data.kind;
      const createPayload = {
        title:
          kindHint === "warehouse"
            ? `Склад — ${wizard.data.city} — ${wizard.data.address}`
            : `${wizard.data.city} — ${wizard.data.address}`,
        location,
        areaM2: wizard.data.areaM2,
        rentRate: wizard.data.rentRate,
        serviceRate: wizard.data.serviceRate,
        currency: "USD",
        monthlyTotal: wizard.data.monthlyTotal,
        term: "по договоренности",
        description: wizard.data.description,
        visibleToClient: true
      };

      // #region agent log
      debugLog("bot-admin-create", "H3", "bot/index.ts:261", "Отправка payload на создание объекта", {
        hasTitle: Boolean(createPayload.title),
        hasLocation: Boolean(createPayload.location),
        areaM2: createPayload.areaM2,
        monthlyTotal: createPayload.monthlyTotal,
        rentRate: createPayload.rentRate,
        serviceRate: createPayload.serviceRate,
        photosCount: wizard.data.photoFileIds.length,
        hasAdminKey: Boolean(adminKey),
        adminKeyLength: adminKey.length,
        kindHint
      });
      // #endregion

      const createRes = await fetch(`${normalizedAppUrl}/api/admin/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`
        },
        body: JSON.stringify(createPayload)
      });

      // #region agent log
      debugLog("bot-admin-create", "H3", "bot/index.ts:281", "Ответ API создания объекта", {
        status: createRes.status,
        ok: createRes.ok
      });
      // #endregion

      if (!createRes.ok) {
        const errText = await createRes.text();
        // #region agent log
        debugLog("bot-admin-create", "H3", "bot/index.ts:241", "Ошибка создания объекта", {
          status: createRes.status,
          error: errText.slice(0, 250)
        });
        // #endregion
        throw new Error(`Не удалось создать объект: ${createRes.status}`);
      }

      const created = (await createRes.json()) as { item: { id: string } };
      const propertyId = created.item.id;

      if (wizard.data.photoFileIds.length > 0) {
        const formData = new FormData();

        for (let i = 0; i < wizard.data.photoFileIds.length; i += 1) {
          const fileUrl = await ctx.telegram.getFileLink(wizard.data.photoFileIds[i]);
          const fileRes = await fetch(fileUrl.toString());
          const fileBlob = await fileRes.blob();
          formData.append(
            "files",
            new File([fileBlob], `photo-${i + 1}.jpg`, { type: fileBlob.type || "image/jpeg" })
          );
        }

        const uploadRes = await fetch(`${normalizedAppUrl}/api/admin/properties/${propertyId}/photos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminKey}`
          },
          body: formData
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          // #region agent log
          debugLog("bot-admin-create", "H4", "bot/index.ts:276", "Ошибка загрузки фото", {
            status: uploadRes.status,
            error: errText.slice(0, 250)
          });
          // #endregion
          throw new Error(`Объект создан, но фото не загружены: ${uploadRes.status}`);
        }
      }

      wizardByAdmin.delete(ctx.from.id);

      // #region agent log
      debugLog("bot-admin-create", "H5", "bot/index.ts:288", "Объект успешно создан", {
        propertyId,
        photosCount: wizard.data.photoFileIds.length
      });
      // #endregion

      await ctx.reply(
        `Объект создан.\nАдминка: ${adminUrl}/properties/${propertyId}\nКлиент: ${normalizedAppUrl}`
      );
      return;
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Ошибка создания объекта");
      return;
    }
  }

  if (wizard.step === "city") {
    const kindHint = detectKindHint(text);
    wizard.data.kind = kindHint;
    // #region agent log
    debugLog("bot-kind-hint", "H44", "bot/index.ts:707", "Определение типа объекта по первому вводу", {
      adminId: ctx.from.id,
      kindHint
    });
    // #endregion

    const parsedBlock = parsePropertyBlock(text);
    if (parsedBlock) {
      wizard.data.city = parsedBlock.city;
      wizard.data.address = parsedBlock.address;
      wizard.data.areaM2 = parsedBlock.areaM2;
      wizard.data.monthlyTotal = parsedBlock.monthlyTotal;
      wizard.data.rentRate = parsedBlock.rentRate;
      wizard.data.serviceRate = parsedBlock.serviceRate;
      wizard.data.description = parsedBlock.description;
      wizard.step = "photos";

      // #region agent log
      debugLog("bot-admin-create", "H7", "bot/index.ts:412", "Распарсили объект из одного сообщения", {
        adminId: ctx.from.id,
        hasDescription: Boolean(parsedBlock.description),
        kindHint
      });
      // #endregion

      await ctx.reply(
        "Данные объекта распознаны из одного сообщения. Теперь пришлите фото и отправьте 'Готово'."
      );
      return;
    }

    // #region agent log
    debugLog("bot-admin-create", "H8", "bot/index.ts:431", "Блок не распознан, переходим в пошаговый режим", {
      adminId: ctx.from.id,
      textPreview: text.slice(0, 120),
      textLength: text.length
    });
    // #endregion

    if (kindHint === "warehouse") {
      const cityAfterKind = text.replace(/^склад\b[:\s-]*/i, "").trim();
      if (!cityAfterKind) {
        await ctx.reply("Режим: склад. Введите Город:");
        return;
      }
      wizard.data.city = cityAfterKind;
    } else {
      wizard.data.city = text;
    }
  } else if (wizard.step === "address") {
    wizard.data.address = text;
  } else if (wizard.step === "areaM2") {
    const parsed = parseNumber(text);
    if (parsed == null) {
      await ctx.reply("Метраж должен быть числом. Попробуйте снова.");
      return;
    }
    wizard.data.areaM2 = parsed;
  } else if (wizard.step === "monthlyTotal") {
    const parsed = parseNumber(text);
    if (parsed == null) {
      // #region agent log
      debugLog("bot-admin-create", "H23", "bot/index.ts:541", "Невалидная цена в пошаговом вводе", {
        input: text.slice(0, 40)
      });
      // #endregion
      await ctx.reply("Цена должна быть числом. Попробуйте снова.");
      return;
    }
    wizard.data.monthlyTotal = parsed;
  } else if (wizard.step === "rentRate") {
    const parsed = parseNumber(text);
    if (parsed == null) {
      // #region agent log
      debugLog("bot-admin-create", "H24", "bot/index.ts:552", "Невалидная цена м2 в пошаговом вводе", {
        input: text.slice(0, 40)
      });
      // #endregion
      await ctx.reply("Цена м2 должна быть числом. Попробуйте снова.");
      return;
    }
    wizard.data.rentRate = parsed;
  } else if (wizard.step === "serviceRate") {
    const parsed = parseNumber(text);
    if (parsed == null) {
      // #region agent log
      debugLog("bot-admin-create", "H25", "bot/index.ts:563", "Невалидный сервис чардж в пошаговом вводе", {
        input: text.slice(0, 40)
      });
      // #endregion
      await ctx.reply("Сервис чардж должен быть числом. Попробуйте снова.");
      return;
    }
    wizard.data.serviceRate = parsed;
  } else if (wizard.step === "description") {
    wizard.data.description = text;
  }

  const next = nextStep(wizard.step);
  if (!next) return;
  wizard.step = next;
  await ctx.reply(wizardPrompt(next));
});

bot.catch((error) => {
  console.error("Unhandled bot error", error);
});

bot.launch().then(async () => {
  bot.telegram
    .setMyCommands([
      { command: "start", description: "Запустить меню" },
      { command: "menu", description: "Показать ссылки" },
      { command: "add_property", description: "Добавить объект (админ)" },
      { command: "cancel", description: "Отменить создание объекта" }
    ])
    .catch((error) => {
      console.error("Failed to set commands", error);
    });

  try {
    await bot.telegram.setChatMenuButton({
      menuButton: {
        type: "web_app",
        text: "Открыть",
        web_app: {
          url: normalizedAppUrl
        }
      }
    });
    // #region agent log
    debugLog("bot-open-client", "H49", "bot/index.ts:888", "Обновлена кнопка Open в Telegram меню", {
      url: normalizedAppUrl
    });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog("bot-open-client", "H50", "bot/index.ts:896", "Не удалось обновить кнопку Open", {
      errorMessage: error instanceof Error ? (error as Error).message : "unknown",
      url: normalizedAppUrl
    });
    // #endregion
    console.error("Failed to set chat menu button", error);
  }

  console.log("Telegram bot started");
}).catch((error) => {
  console.error("Telegram bot failed to start", error);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
