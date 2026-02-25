import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export function getClientTelegramId(req: NextRequest): string {
  const fromHeader = req.headers.get("x-telegram-user-id");
  const fromQuery = req.nextUrl.searchParams.get("telegramUserId");
  return (fromHeader ?? fromQuery ?? "").trim();
}

export function ensureClient(req: NextRequest): NextResponse | null {
  void req;
  return null;
}

export function ensureAdmin(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization") ?? "";
  const fromBearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const fromHeader = req.headers.get("x-admin-key") ?? "";
  const candidate = (fromBearer || fromHeader).trim();

  // #region agent log
  fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7c18f5"
    },
    body: JSON.stringify({
      sessionId: "7c18f5",
      runId: "admin-auth-401",
      hypothesisId: "H17",
      location: "lib/auth.ts:19",
      message: "Проверка admin-авторизации",
      data: {
        hasAuthorizationHeader: Boolean(auth),
        hasBearerPrefix: auth.startsWith("Bearer "),
        candidateLength: candidate.length,
        envAdminKeyLength: env.adminKey.length,
        isMatch: Boolean(env.adminKey) && candidate === env.adminKey
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  if (!env.adminKey || candidate !== env.adminKey) {
    return NextResponse.json({ error: "Unauthorized admin" }, { status: 401 });
  }

  return null;
}
