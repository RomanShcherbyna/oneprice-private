"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PropertyListCard } from "@/components/PropertyListCard";
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

export default function ClientMiniAppPage() {
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [telegramUserId, setTelegramUserId] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "warehouse" | "premise">("all");
  const [cityFilter, setCityFilter] = useState("Все");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/client/properties", {
        headers: {
          "x-telegram-user-id": telegramUserId
        }
      });
      if (!res.ok) {
        // #region agent log
        try {
          const debugBody = await res.text();
          fetch("http://127.0.0.1:7844/ingest/4b4bde9f-ccf9-4dcf-b693-48a9dbeb8ce6", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "4e8591"
            },
            body: JSON.stringify({
              sessionId: "4e8591",
              runId: "client-properties",
              hypothesisId: "H4",
              location: "app/page.tsx:45",
              message: "Ответ /api/client/properties с ошибкой",
              data: {
                status: res.status,
                bodyPreview: debugBody.slice(0, 200)
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
        } catch {
          fetch("http://127.0.0.1:7844/ingest/4b4bde9f-ccf9-4dcf-b693-48a9dbeb8ce6", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "4e8591"
            },
            body: JSON.stringify({
              sessionId: "4e8591",
              runId: "client-properties",
              hypothesisId: "H4",
              location: "app/page.tsx:45",
              message: "Ответ /api/client/properties с ошибкой (без тела)",
              data: {
                status: res.status
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
        }
        // #endregion
        throw new Error("Ошибка загрузки объектов");
      }
      const data = (await res.json()) as { items: ApiProperty[] };
      setItems(data.items);

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
          hypothesisId: "H1",
          location: "app/page.tsx:49",
          message: "Список объектов загружен",
          data: {
            count: data.items.length,
            telegramUserId
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const queryTelegramUserId = new URLSearchParams(window.location.search).get("telegramUserId");
    const queryTelegramUsername = new URLSearchParams(window.location.search).get("telegramUsername");
    const resolvedTelegramUserId =
      String(webApp?.initDataUnsafe?.user?.id ?? queryTelegramUserId ?? "").trim() || "public-web";
    const resolvedTelegramUsername =
      String(webApp?.initDataUnsafe?.user?.username ?? queryTelegramUsername ?? "").trim() || "guest";

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "user-identity",
        hypothesisId: "H32",
        location: "app/page.tsx:82",
        message: "Разрешение пользователя для клиентской страницы",
        data: {
          hasQueryUserId: Boolean(queryTelegramUserId),
          hasQueryUsername: Boolean(queryTelegramUsername),
          resolvedUsername: resolvedTelegramUsername
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    webApp?.ready?.();
    setTelegramUserId(resolvedTelegramUserId);
    setTelegramUsername(resolvedTelegramUsername);
  }, []);

  useEffect(() => {
    if (telegramUserId) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramUserId]);

  // #region agent log
  function logAdminMenuOpen() {
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "admin-nav",
        hypothesisId: "H4",
        location: "app/page.tsx:97",
        message: "Переход в админ меню из каталога",
        data: {
          telegramUserId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
  // #endregion

  function detectType(item: ApiProperty): "warehouse" | "premise" {
    const haystack = `${item.title} ${item.location} ${item.description}`.toLowerCase();
    return haystack.includes("склад") ? "warehouse" : "premise";
  }

  function detectCity(item: ApiProperty): string {
    const cities = ["Варшава", "Лодзь", "Краков", "Гданськ", "Вроцлав", "Катовице"];
    const haystack = `${item.title} ${item.location} ${item.description}`.toLowerCase();
    const match = cities.find((city) => haystack.includes(city.toLowerCase()));
    return match || "Все";
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const type = detectType(item);
      if (typeFilter !== "all" && typeFilter !== type) return false;

      if (typeFilter === "premise" && cityFilter !== "Все") {
        return detectCity(item) === cityFilter;
      }
      return true;
    });
  }, [items, typeFilter, cityFilter]);

  function setTypeFilterWithLog(next: "all" | "warehouse" | "premise") {
    setTypeFilter(next);
    if (next !== "premise") {
      setCityFilter("Все");
    }
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "client-filters",
        hypothesisId: "H35",
        location: "app/page.tsx:152",
        message: "Изменение фильтра типа объекта",
        data: {
          nextType: next
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  function setCityFilterWithLog(next: string) {
    setCityFilter(next);
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "client-filters",
        hypothesisId: "H36",
        location: "app/page.tsx:177",
        message: "Изменение фильтра города",
        data: {
          nextCity: next
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  if (loading) {
    return (
      <main className="container">
        <p>Загрузка...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <p style={{ color: "crimson" }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="top-actions">
        <div>
          <h1 className="page-title">Ваше предложение</h1>
          <p className="page-subtitle">Выберите объект, чтобы посмотреть подробную информацию.</p>
        </div>
        <Link href="/admin" className="top-action-btn" onClick={logAdminMenuOpen}>
          админ
        </Link>
      </div>

      <details className="filter-window">
        <summary>Склады/Помещение</summary>
        <div className="filter-window__body">
          <div className="filter-row">
            <button
              type="button"
              className={typeFilter === "all" ? "chip chip--active" : "chip"}
              onClick={() => setTypeFilterWithLog("all")}
            >
              Все
            </button>
            <button
              type="button"
              className={typeFilter === "warehouse" ? "chip chip--active" : "chip"}
              onClick={() => setTypeFilterWithLog("warehouse")}
            >
              Склады
            </button>
            <button
              type="button"
              className={typeFilter === "premise" ? "chip chip--active" : "chip"}
              onClick={() => setTypeFilterWithLog("premise")}
            >
              Помещение
            </button>
          </div>

          {typeFilter === "premise" && (
            <div className="filter-row">
              {["Варшава", "Лодзь", "Краков", "Гданськ", "Вроцлав", "Катовице", "Все"].map((city) => (
                <button
                  key={city}
                  type="button"
                  className={cityFilter === city ? "chip chip--active" : "chip"}
                  onClick={() => setCityFilterWithLog(city)}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
      </details>

      {filteredItems.length === 0 && <p>Нет доступных объектов</p>}
      <section className="catalog-grid">
        {filteredItems.map((item) => (
          <PropertyListCard
            key={item.id}
            item={item}
            telegramUserId={telegramUserId}
            telegramUsername={telegramUsername}
          />
        ))}
      </section>
    </main>
  );
}
