"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PropertyCard } from "@/components/PropertyCard";
import { ApiProperty } from "@/lib/types";

type TelegramWebAppUser = {
  id?: number;
  username?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        initDataUnsafe?: {
          user?: TelegramWebAppUser;
        };
      };
    };
  }
}

export default function PropertyDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [propertyId, setPropertyId] = useState("");
  const [item, setItem] = useState<ApiProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [telegramUserId, setTelegramUserId] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");

  async function loadDetails(id: string, currentTelegramUserId: string) {
    setLoading(true);
    setError("");
    try {
      // #region agent log
      fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "7c18f5"
        },
        body: JSON.stringify({
          sessionId: "7c18f5",
          runId: "property-load-error",
          hypothesisId: "H39",
          location: "app/property/[id]/page.tsx:40",
          message: "Старт загрузки объекта на клиенте",
          data: {
            propertyId: id,
            telegramUserIdLength: currentTelegramUserId.length
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      const res = await fetch(`/api/client/properties/${id}`, {
        headers: {
          "x-telegram-user-id": currentTelegramUserId
        }
      });

      if (!res.ok) {
        const responseText = await res.text();
        // #region agent log
        fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "7c18f5"
          },
          body: JSON.stringify({
            sessionId: "7c18f5",
            runId: "property-load-error",
            hypothesisId: "H40",
            location: "app/property/[id]/page.tsx:66",
            message: "API вернул неуспешный статус при загрузке объекта",
            data: {
              propertyId: id,
              status: res.status,
              responsePreview: responseText.slice(0, 250)
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        throw new Error("Не удалось загрузить объект");
      }

      const data = (await res.json()) as { item: ApiProperty };
      setItem(data.item);

      // #region agent log
      fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "7c18f5"
        },
        body: JSON.stringify({
          sessionId: "7c18f5",
          runId: "ui-v2",
          hypothesisId: "H3",
          location: "app/property/[id]/page.tsx:42",
          message: "Деталь объекта загружена",
          data: {
            propertyId: id
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    } catch (loadError) {
      // #region agent log
      fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "7c18f5"
        },
        body: JSON.stringify({
          sessionId: "7c18f5",
          runId: "property-load-error",
          hypothesisId: "H43",
          location: "app/property/[id]/page.tsx:99",
          message: "Исключение на клиенте при загрузке объекта",
          data: {
            propertyId: id,
            errorMessage: loadError instanceof Error ? loadError.message : "unknown"
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    params.then((value) => setPropertyId(value.id));

    const query = new URLSearchParams(window.location.search);
    const fromQueryUserId = query.get("telegramUserId");
    const fromQueryUsername = query.get("telegramUsername");
    const fromTelegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const fromTelegramUsername = window.Telegram?.WebApp?.initDataUnsafe?.user?.username;

    const resolvedUserId =
      String(fromTelegramUserId ?? fromQueryUserId ?? "").trim() || "public-web";
    const resolvedUsername = String(fromTelegramUsername ?? fromQueryUsername ?? "").trim() || "guest";

    setTelegramUserId(resolvedUserId);
    setTelegramUsername(resolvedUsername);
    window.Telegram?.WebApp?.ready?.();
  }, [params]);

  useEffect(() => {
    if (!propertyId || !telegramUserId) return;
    void loadDetails(propertyId, telegramUserId);
  }, [propertyId, telegramUserId]);

  // #region agent log
  function logAdminMenuOpenFromDetail() {
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "admin-nav",
        hypothesisId: "H6",
        location: "app/property/[id]/page.tsx:105",
        message: "Переход в админ меню из карточки объекта",
        data: {
          propertyId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
  // #endregion

  if (loading) {
    return (
      <main className="container">
        <p>Загрузка объекта...</p>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="container">
        <Link href="/" className="back-link">
          ← К списку объектов
        </Link>
        <p style={{ color: "crimson" }}>{error || "Объект не найден"}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="top-actions">
        <Link href="/" className="back-link">
          ← К списку объектов
        </Link>
        <Link href="/admin" className="top-action-btn" onClick={logAdminMenuOpenFromDetail}>
          админ
        </Link>
      </div>
      <PropertyCard
        item={item}
        telegramUserId={telegramUserId}
        telegramUsername={telegramUsername}
        onCommentCreated={async () => loadDetails(propertyId, telegramUserId)}
      />
    </main>
  );
}
