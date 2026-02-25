import { NextRequest, NextResponse } from "next/server";
import { MessageAuthorType } from "@prisma/client";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toFileUrl } from "@/lib/upload";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id: propertyId } = await ctx.params;

  const items = await prisma.clientComment.findMany({
    where: { propertyId },
    include: { attachments: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({
    items: items.map((comment) => ({
      id: comment.id,
      authorType: comment.authorType,
      authorName: comment.authorName,
      telegramUserId: comment.telegramUserId,
      text: comment.text,
      createdAt: comment.createdAt,
      attachments: comment.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        filePath: attachment.filePath,
        url: toFileUrl(attachment.filePath)
      }))
    }))
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id: propertyId } = await ctx.params;
  const body = (await req.json()) as { text?: string; authorName?: string };
  const text = String(body.text || "").trim();
  const authorName = String(body.authorName || "").trim() || "Роман";

  if (!text) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }

  const created = await prisma.clientComment.create({
    data: {
      propertyId,
      authorType: MessageAuthorType.ADMIN,
      authorName,
      telegramUserId: "admin-web",
      text
    },
    include: { attachments: true }
  });

  return NextResponse.json({
    item: {
      id: created.id,
      authorType: created.authorType,
      authorName: created.authorName,
      telegramUserId: created.telegramUserId,
      text: created.text,
      createdAt: created.createdAt,
      attachments: created.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        filePath: attachment.filePath,
        url: toFileUrl(attachment.filePath)
      }))
    }
  });
}
