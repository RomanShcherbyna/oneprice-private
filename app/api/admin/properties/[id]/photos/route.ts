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

  const existing = await prisma.propertyPhoto.count({ where: { propertyId } });
  const formData = await req.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const created = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const saved = await saveWebFile(file, `properties/${propertyId}/photos`);
    const row = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        filePath: saved.storedPath,
        sortOrder: existing + index
      }
    });
    created.push(row);
  }

  return NextResponse.json({
    items: created.map((photo) => ({
      id: photo.id,
      sortOrder: photo.sortOrder,
      filePath: photo.filePath,
      url: toFileUrl(photo.filePath)
    }))
  });
}
