import { NextRequest, NextResponse } from "next/server";
import { MessageAuthorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureClient, getClientTelegramId } from "@/lib/auth";
import { notifyAdminNewComment } from "@/lib/telegram";
import { saveWebFile, toFileUrl } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureClient(req);
  if (unauthorized) return unauthorized;

  const { id: propertyId } = await ctx.params;
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });
  if (!property || !property.visibleToClient) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const text = String(formData.get("text") || "").trim();
  const authorName = String(formData.get("authorName") || formData.get("telegramUsername") || "").trim() || "Клиент";
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const comment = await prisma.clientComment.create({
    data: {
      propertyId,
      authorType: MessageAuthorType.CLIENT,
      authorName,
      telegramUserId: getClientTelegramId(req),
      text: text || null
    }
  });

  const saved = [];
  for (const file of files) {
    const entry = await saveWebFile(file, `comments/${comment.id}`);
    const attachment = await prisma.commentAttachment.create({
      data: {
        commentId: comment.id,
        fileName: entry.originalName,
        filePath: entry.storedPath,
        mimeType: entry.mimeType,
        sizeBytes: entry.sizeBytes
      }
    });
    saved.push(attachment);
  }

  await notifyAdminNewComment({
    propertyId,
    propertyTitle: property.title,
    authorName,
    text: comment.text,
    attachmentsCount: saved.length
  });

  return NextResponse.json({
    item: {
      id: comment.id,
      authorType: comment.authorType,
      authorName: comment.authorName,
      telegramUserId: comment.telegramUserId,
      text: comment.text,
      createdAt: comment.createdAt,
      attachments: saved.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        filePath: item.filePath,
        url: toFileUrl(item.filePath)
      }))
    }
  });
}
