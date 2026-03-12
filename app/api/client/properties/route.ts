import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureClient, getClientTelegramId } from "@/lib/auth";
import { serializeProperty } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  const unauthorized = ensureClient(req);
  if (unauthorized) return unauthorized;

  const telegramUserId = getClientTelegramId(req);

  // #region agent log
  fetch("http://127.0.0.1:7844/ingest/4b4bde9f-ccf9-4dcf-b693-48a9dbeb8ce6", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "4e8591"
    },
    body: JSON.stringify({
      sessionId: "4e8591",
      runId: "client-properties",
      hypothesisId: "H1",
      location: "app/api/client/properties/route.ts:16",
      message: "Старт запроса списка объектов",
      data: {
        hasTelegramUserId: Boolean(telegramUserId)
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  try {
    const items = await prisma.property.findMany({
      where: { visibleToClient: true },
      include: {
        photos: true,
        videos: true,
        docs: true,
        comments: {
          include: { attachments: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // #region agent log
    fetch("http://127.0.0.1:7687/ingest/8763eeef-e15c-4e65-8846-954cee9a65ad", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ae818a"
      },
      body: JSON.stringify({
        sessionId: "ae818a",
        runId: "client-properties",
        hypothesisId: "H3",
        location: "app/api/client/properties/route.ts:52",
        message: "Список объектов для клиента получен, логируем фото",
        data: {
          count: items.length,
          firstPhotosCount: items[0]?.photos?.length ?? 0,
          firstPhotoSample: items[0]?.photos?.slice(0, 3).map((p) => ({
            id: p.id,
            sortOrder: p.sortOrder,
            filePath: p.filePath
          }))
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    // #region agent log
    fetch("http://127.0.0.1:7844/ingest/4b4bde9f-ccf9-4dcf-b693-48a9dbeb8ce6", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "4e8591"
      },
      body: JSON.stringify({
        sessionId: "4e8591",
        runId: "client-properties",
        hypothesisId: "H2",
        location: "app/api/client/properties/route.ts:37",
        message: "Список объектов получен из БД",
        data: {
          count: items.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({
      items: items.map((item) => serializeProperty(item))
    });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7844/ingest/4b4bde9f-ccf9-4dcf-b693-48a9dbeb8ce6", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "4e8591"
      },
      body: JSON.stringify({
        sessionId: "4e8591",
        runId: "client-properties",
        hypothesisId: "H3",
        location: "app/api/client/properties/route.ts:50",
        message: "Ошибка при загрузке списка объектов",
        data: {
          errorMessage: error instanceof Error ? error.message : "unknown"
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    throw error;
  }
}
