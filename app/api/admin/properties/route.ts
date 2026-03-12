import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePropertyCreateInput } from "@/lib/validators";
import { serializeProperty } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  const items = await prisma.property.findMany({
    include: {
      photos: true,
      videos: true,
      docs: true,
      comments: {
        include: {
          attachments: true
        },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (format === "csv") {
    const header = [
      "id",
      "title",
      "location",
      "contactPhone",
      "privateNote",
      "areaM2",
      "rentRate",
      "serviceRate",
      "currency",
      "monthlyTotal",
      "term",
      "description",
      "visibleToClient",
      "showDocsToClient",
      "createdAt",
      "updatedAt",
      "photosCount",
      "videosCount",
      "docsCount",
      "commentsCount"
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const lines = [
      header.join(","),
      ...items.map((item) =>
        [
          item.id,
          item.title,
          item.location,
          item.contactPhone ?? "",
          item.privateNote ?? "",
          item.areaM2,
          item.rentRate,
          item.serviceRate,
          item.currency,
          item.monthlyTotal ?? "",
          item.term,
          item.description,
          item.visibleToClient,
          item.showDocsToClient,
          item.createdAt.toISOString(),
          item.updatedAt.toISOString(),
          item.photos.length,
          item.videos.length,
          item.docs.length,
          item.comments.length
        ].map(escapeCsv).join(",")
      )
    ];

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="properties-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`
      }
    });
  }

  return NextResponse.json({
    items: items.map((item) => serializeProperty(item, { includePrivateFields: true }))
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();

  try {
    const data = parsePropertyCreateInput(body);
    const created = await prisma.property.create({
      data,
      include: { photos: true, videos: true, docs: true, comments: { include: { attachments: true } } }
    });
    return NextResponse.json(
      { item: serializeProperty(created, { includePrivateFields: true }) },
      { status: 201 }
    );
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
        runId: "bot-admin-create",
        hypothesisId: "H6",
        location: "app/api/admin/properties/route.ts:47",
        message: "Ошибка в POST /api/admin/properties",
        data: {
          errorMessage: error instanceof Error ? error.message : "Invalid payload"
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payload" },
      { status: 400 }
    );
  }
}
