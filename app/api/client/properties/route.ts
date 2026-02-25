import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureClient } from "@/lib/auth";
import { serializeProperty } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  const unauthorized = ensureClient(req);
  if (unauthorized) return unauthorized;

  const items = await prisma.property.findMany({
    where: { visibleToClient: true },
    include: {
      photos: true,
      videos: true,
      docs: true,
      comments: {
        include: { attachments: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    items: items.map((item) => serializeProperty(item))
  });
}
