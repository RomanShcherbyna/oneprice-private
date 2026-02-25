import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { uploadsAbsolutePath } from "@/lib/upload";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: chunks } = await ctx.params;
  const joined = chunks.join("/");
  const normalized = path.normalize(joined).replace(/^(\.\.(\/|\\|$))+/, "");
  const absPath = uploadsAbsolutePath(normalized);

  try {
    const data = await fs.readFile(absPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream"
      }
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
