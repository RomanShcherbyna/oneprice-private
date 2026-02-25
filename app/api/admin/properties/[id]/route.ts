import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePropertyUpdateInput } from "@/lib/validators";
import { serializeProperty } from "@/lib/serializers";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  const item = await prisma.property.findUnique({
    where: { id },
    include: {
      photos: true,
      videos: true,
      docs: true,
      comments: {
        include: { attachments: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!item) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  const serialized = serializeProperty(item, { includePrivateFields: true });

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId: "status-visibility",
      hypothesisId: "H15",
      location: "app/api/admin/properties/[id]/route.ts:27",
      message: "Сформирован ответ админ-объекта",
      data: {
        propertyId: id,
        hasStatusField: Object.prototype.hasOwnProperty.call(serialized, "status")
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  return NextResponse.json({ item: serialized });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const data = parsePropertyUpdateInput(body);
    const updated = await prisma.property.update({
      where: { id },
      data,
      include: {
        photos: true,
        videos: true,
        docs: true,
        comments: { include: { attachments: true }, orderBy: { createdAt: "asc" } }
      }
    });
    return NextResponse.json({ item: serializeProperty(updated, { includePrivateFields: true }) });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
