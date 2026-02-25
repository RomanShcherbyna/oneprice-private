import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; videoId: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id, videoId } = await ctx.params;
  await prisma.propertyVideo.deleteMany({
    where: { id: videoId, propertyId: id }
  });
  return NextResponse.json({ ok: true });
}
