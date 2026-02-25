import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; photoId: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id, photoId } = await ctx.params;
  const body = await req.json();
  const sortOrder = Number(body.sortOrder);

  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: "sortOrder must be integer" }, { status: 400 });
  }

  const updated = await prisma.propertyPhoto.updateMany({
    where: { id: photoId, propertyId: id },
    data: { sortOrder }
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; photoId: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;
  const { id, photoId } = await ctx.params;
  await prisma.propertyPhoto.deleteMany({
    where: { id: photoId, propertyId: id }
  });
  return NextResponse.json({ ok: true });
}
