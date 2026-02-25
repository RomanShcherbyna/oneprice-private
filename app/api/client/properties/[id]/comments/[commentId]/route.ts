import { NextRequest, NextResponse } from "next/server";
import { MessageAuthorType } from "@prisma/client";
import { ensureClient, getClientTelegramId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; commentId: string }> }
) {
  const unauthorized = ensureClient(req);
  if (unauthorized) return unauthorized;

  const { id: propertyId, commentId } = await ctx.params;
  const requesterId = getClientTelegramId(req);
  if (!requesterId) {
    return NextResponse.json({ error: "Telegram user is required" }, { status: 400 });
  }

  const comment = await prisma.clientComment.findUnique({
    where: { id: commentId }
  });
  if (!comment || comment.propertyId !== propertyId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const canDeleteOwn =
    comment.authorType === MessageAuthorType.CLIENT && comment.telegramUserId === requesterId;

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId: "comment-delete",
      hypothesisId: "H30",
      location: "app/api/client/properties/[id]/comments/[commentId]/route.ts:31",
      message: "Попытка удаления клиентского комментария",
      data: {
        propertyId,
        commentId,
        requesterIdLength: requesterId.length,
        canDeleteOwn
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  if (!canDeleteOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.clientComment.delete({
    where: { id: commentId }
  });

  return NextResponse.json({ ok: true });
}
