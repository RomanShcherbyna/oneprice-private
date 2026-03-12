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

    // #region agent log
    fetch("http://127.0.0.1:7687/ingest/8763eeef-e15c-4e65-8846-954cee9a65ad", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ae818a"
      },
      body: JSON.stringify({
        sessionId: "ae818a",
        runId: "files-endpoint",
        hypothesisId: "H1",
        location: "app/api/files/[...path]/route.ts:21",
        message: "Файл для фото найден",
        data: {
          requestedPath: joined,
          normalizedPath: normalized,
          absolutePath: absPath,
          sizeBytes: data.byteLength
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream"
      }
    });
  } catch {
    // #region agent log
    fetch("http://127.0.0.1:7687/ingest/8763eeef-e15c-4e65-8846-954cee9a65ad", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ae818a"
      },
      body: JSON.stringify({
        sessionId: "ae818a",
        runId: "files-endpoint",
        hypothesisId: "H1",
        location: "app/api/files/[...path]/route.ts:33",
        message: "Файл для фото не найден или не читается",
        data: {
          requestedPath: joined,
          normalizedPath: normalized,
          absolutePath: absPath
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
