"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiProperty } from "@/lib/types";

export default function AdminListPage() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [error, setError] = useState("");

  async function loadProperties(currentKey: string) {
    const res = await fetch("/api/admin/properties", {
      headers: {
        Authorization: `Bearer ${currentKey}`
      }
    });
    if (!res.ok) {
      throw new Error("Проверьте admin key");
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
        runId: "status-visibility",
        hypothesisId: "H16",
        location: "app/admin/page.tsx:24",
        message: "Список объектов загружен в админке",
        data: {
          count: data.items.length,
          firstItemHasStatusField:
            data.items.length > 0 ? Object.prototype.hasOwnProperty.call(data.items[0], "status") : null
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  useEffect(() => {
    const saved = localStorage.getItem("admin_key") ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminKey(saved);
    if (saved) {
      loadProperties(saved).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
      });
    }
  }, []);

  async function onApplyKey() {
    try {
      localStorage.setItem("admin_key", adminKey);
      setError("");
      await loadProperties(adminKey);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    }
  }

  // #region agent log
  function logBackToCatalog() {
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "admin-nav",
        hypothesisId: "H5",
        location: "app/admin/page.tsx:47",
        message: "Переход из админки в каталог",
        data: {},
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
  // #endregion

  return (
    <main className="container">
      <div className="top-actions">
        <h1>Admin: объекты</h1>
        <Link href="/" className="top-action-btn" onClick={logBackToCatalog}>
          К каталогу
        </Link>
      </div>
      <div className="card">
        <div className="field">
          <label htmlFor="adminKey">Admin key</label>
          <input
            id="adminKey"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
        </div>
        <button type="button" onClick={onApplyKey}>
          Применить ключ
        </button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </div>

      <div className="card">
        <Link href="/admin/properties/new">+ Добавить объект</Link>
      </div>

      {items.map((item) => (
        <div className="card" key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.location}</p>
          <p>Виден клиенту: {item.visibleToClient ? "Да" : "Нет"}</p>
          <Link href={`/admin/properties/${item.id}`}>Открыть редактор</Link>
        </div>
      ))}
    </main>
  );
}
