import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWebFile, toFileUrl } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id: propertyId } = await ctx.params;
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const formData = await req.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const created = [];
  for (const file of files) {
    const saved = await saveWebFile(file, `properties/${propertyId}/docs`);
    const row = await prisma.propertyDoc.create({
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
    items: created.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      url: toFileUrl(doc.filePath)
    }))
  });
}
