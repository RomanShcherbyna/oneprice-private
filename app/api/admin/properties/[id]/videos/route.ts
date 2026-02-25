import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWebFile, toFileUrl } from "@/lib/upload";

export const runtime = "nodejs";

const MAX_VIDEOS_PER_PROPERTY = 5;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id: propertyId } = await ctx.params;
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const existingCount = await prisma.propertyVideo.count({ where: { propertyId } });
  const formData = await req.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId: "video-upload",
      hypothesisId: "H28",
      location: "app/api/admin/properties/[id]/videos/route.ts:30",
      message: "Попытка загрузки видео на объект",
      data: {
        propertyId,
        existingCount,
        incomingCount: files.length
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  if (files.length === 0) {
    return NextResponse.json({ error: "No video files uploaded" }, { status: 400 });
  }

  if (existingCount + files.length > MAX_VIDEOS_PER_PROPERTY) {
    return NextResponse.json(
      { error: `Video limit exceeded. Max ${MAX_VIDEOS_PER_PROPERTY} per property` },
      { status: 400 }
    );
  }

  const created = [];
  for (const file of files) {
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }
    const saved = await saveWebFile(file, `properties/${propertyId}/videos`);
    const row = await prisma.propertyVideo.create({
      data: {
        propertyId,
        fileName: saved.originalName,
        filePath: saved.storedPath,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes
      }
    });
    created.push(row);
  }

  return NextResponse.json({
    items: created.map((video) => ({
      id: video.id,
      fileName: video.fileName,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      filePath: video.filePath,
      url: toFileUrl(video.filePath)
    }))
  });
}
