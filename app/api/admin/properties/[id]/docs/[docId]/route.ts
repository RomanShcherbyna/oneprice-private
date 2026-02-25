import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;
  const { id, docId } = await ctx.params;

  await prisma.propertyDoc.deleteMany({
    where: { id: docId, propertyId: id }
  });

  return NextResponse.json({ ok: true });
}
