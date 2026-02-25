import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureClient } from "@/lib/auth";
import { serializeProperty } from "@/lib/serializers";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureClient(req);
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  try {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "property-load-error",
        hypothesisId: "H41",
        location: "app/api/client/properties/[id]/route.ts:15",
        message: "Старт API загрузки объекта",
        data: {
          propertyId: id
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    const item = await prisma.property.findFirst({
      where: { id, visibleToClient: true },
      include: {
        photos: true,
        videos: true,
        docs: true,
        comments: {
          include: { attachments: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!item) {
      const hiddenOrMissing = await prisma.property.findUnique({
        where: { id },
        select: { id: true, visibleToClient: true }
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
          runId: "property-load-error",
          hypothesisId: "H42",
          location: "app/api/client/properties/[id]/route.ts:48",
          message: "Объект недоступен для клиента",
          data: {
            propertyId: id,
            exists: Boolean(hiddenOrMissing),
            visibleToClient: hiddenOrMissing?.visibleToClient ?? null
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const serialized = serializeProperty(item);

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "client-controls",
        hypothesisId: "H9",
        location: "app/api/client/properties/[id]/route.ts:73",
        message: "Формирование клиентского ответа по объекту",
        data: {
          propertyId: id,
          hasContactPhoneField: Object.prototype.hasOwnProperty.call(serialized, "contactPhone"),
          showDocsToClient: serialized.showDocsToClient,
          docsCount: serialized.docs.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ item: serialized });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "property-load-error",
        hypothesisId: "H41",
        location: "app/api/client/properties/[id]/route.ts:91",
        message: "Исключение в API загрузки объекта",
        data: {
          propertyId: id,
          errorMessage: error instanceof Error ? error.message : "unknown"
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
