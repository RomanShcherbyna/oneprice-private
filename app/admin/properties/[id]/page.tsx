"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiComment, ApiProperty } from "@/lib/types";

const emptyProperty: Partial<ApiProperty> = {
  title: "",
  location: "",
  contactPhone: "",
  privateNote: "",
  areaM2: 0,
  rentRate: 0,
  serviceRate: 0,
  currency: "USD",
  monthlyTotal: null,
  term: "",
  description: "",
  visibleToClient: true,
  showDocsToClient: true
};

export default function AdminPropertyEditorPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [propertyId, setPropertyId] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [form, setForm] = useState<Partial<ApiProperty>>(emptyProperty);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [videoFiles, setVideoFiles] = useState<FileList | null>(null);
  const [docFiles, setDocFiles] = useState<FileList | null>(null);
  const [adminName, setAdminName] = useState("Роман");
  const [chatMessage, setChatMessage] = useState("");
  const [error, setError] = useState("");
  const [okMessage, setOkMessage] = useState("");

  const isNew = useMemo(() => propertyId === "new", [propertyId]);

  useEffect(() => {
    params.then((value) => setPropertyId(value.id));
    setAdminKey(localStorage.getItem("admin_key") ?? "");
  }, [params]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "delete-button-visibility",
        hypothesisId: "H11",
        location: "app/admin/properties/[id]/page.tsx:45",
        message: "Состояние видимости кнопки удаления",
        data: {
          path: window.location.pathname,
          propertyId,
          isNew,
          shouldShowDeleteButton: !isNew
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }, [propertyId, isNew]);

  async function adminFetch(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${adminKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }
    return res;
  }

  async function loadExisting(id: string) {
    if (id === "new") return;
    const [propertyRes, commentsRes] = await Promise.all([
      adminFetch(`/api/admin/properties/${id}`),
      adminFetch(`/api/admin/properties/${id}/comments`)
    ]);
    const propertyData = (await propertyRes.json()) as { item: ApiProperty };
    const commentsData = (await commentsRes.json()) as { items: ApiComment[] };
    setForm(propertyData.item);
    setComments(commentsData.items);

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "delete-button-visibility",
        hypothesisId: "H12",
        location: "app/admin/properties/[id]/page.tsx:95",
        message: "Объект загружен в редакторе",
        data: {
          id,
          title: propertyData.item.title,
          hasStatusField: Object.prototype.hasOwnProperty.call(propertyData.item, "status")
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  useEffect(() => {
    if (!propertyId || !adminKey) return;
    loadExisting(propertyId).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, adminKey]);

  function updateField<K extends keyof ApiProperty>(key: K, value: ApiProperty[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProperty() {
    const payload = {
      title: form.title,
      location: form.location,
      contactPhone: form.contactPhone ?? "",
      privateNote: form.privateNote ?? "",
      areaM2: Number(form.areaM2),
      rentRate: Number(form.rentRate),
      serviceRate: Number(form.serviceRate),
      currency: form.currency,
      monthlyTotal: form.monthlyTotal === null || form.monthlyTotal === undefined ? null : Number(form.monthlyTotal),
      term: form.term,
      description: form.description,
      visibleToClient: Boolean(form.visibleToClient),
      showDocsToClient: Boolean(form.showDocsToClient)
    };

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "client-controls",
        hypothesisId: "H7",
        location: "app/admin/properties/[id]/page.tsx:88",
        message: "Сохранение клиентских настроек объекта",
        data: {
          propertyId,
          visibleToClient: payload.visibleToClient,
          showDocsToClient: payload.showDocsToClient
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    const request = isNew
      ? adminFetch("/api/admin/properties", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" }
        })
      : adminFetch(`/api/admin/properties/${propertyId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" }
        });

    const res = await request;
    const data = (await res.json()) as { item: ApiProperty };
    setForm(data.item);
    if (isNew) {
      setPropertyId(data.item.id);
      window.history.replaceState(null, "", `/admin/properties/${data.item.id}`);
    }
    setOkMessage("Сохранено");
    setError("");
  }

  async function uploadPhotos() {
    if (!photoFiles || !propertyId || isNew) return;
    const body = new FormData();
    Array.from(photoFiles).forEach((file) => body.append("files", file));
    await adminFetch(`/api/admin/properties/${propertyId}/photos`, {
      method: "POST",
      body
    });
    setOkMessage("Фото загружены");
    await loadExisting(propertyId);
  }

  async function uploadDocs() {
    if (!docFiles || !propertyId || isNew) return;
    const body = new FormData();
    Array.from(docFiles).forEach((file) => body.append("files", file));
    await adminFetch(`/api/admin/properties/${propertyId}/docs`, {
      method: "POST",
      body
    });
    setOkMessage("Документы загружены");
    await loadExisting(propertyId);
  }

  async function uploadVideos() {
    if (!videoFiles || !propertyId || isNew) return;
    const body = new FormData();
    Array.from(videoFiles).forEach((file) => body.append("files", file));
    await adminFetch(`/api/admin/properties/${propertyId}/videos`, {
      method: "POST",
      body
    });
    setOkMessage("Видео загружены");
    await loadExisting(propertyId);
  }

  async function deleteProperty() {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "delete-button-visibility",
        hypothesisId: "H13",
        location: "app/admin/properties/[id]/page.tsx:199",
        message: "Нажата кнопка удаления объекта",
        data: {
          propertyId,
          isNew
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (!propertyId || isNew) return;

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "delete-button-visibility",
        hypothesisId: "H14",
        location: "app/admin/properties/[id]/page.tsx:222",
        message: "Отправляем DELETE в API",
        data: {
          propertyId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    await adminFetch(`/api/admin/properties/${propertyId}`, { method: "DELETE" });
    window.location.href = "/admin";
  }

  async function deletePhoto(photoId: string) {
    await adminFetch(`/api/admin/properties/${propertyId}/photos/${photoId}`, { method: "DELETE" });
    await loadExisting(propertyId);
  }

  async function deleteDoc(docId: string) {
    await adminFetch(`/api/admin/properties/${propertyId}/docs/${docId}`, { method: "DELETE" });
    await loadExisting(propertyId);
  }

  async function deleteVideo(videoId: string) {
    await adminFetch(`/api/admin/properties/${propertyId}/videos/${videoId}`, { method: "DELETE" });
    await loadExisting(propertyId);
  }

  async function updatePhotoSort(photoId: string, sortOrder: number) {
    await adminFetch(`/api/admin/properties/${propertyId}/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder })
    });
    await loadExisting(propertyId);
  }

  async function setPhotoAsCover(photoId: string) {
    const sorted = [...(form.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const targetIndex = sorted.findIndex((photo) => photo.id === photoId);
    if (targetIndex < 0) return;
    const reordered = [sorted[targetIndex], ...sorted.filter((photo) => photo.id !== photoId)];

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "client-controls",
        hypothesisId: "H8",
        location: "app/admin/properties/[id]/page.tsx:175",
        message: "Установка обложки объекта",
        data: {
          propertyId,
          photoId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    await Promise.all(
      reordered.map((photo, index) =>
        adminFetch(`/api/admin/properties/${propertyId}/photos/${photo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: index })
        })
      )
    );
    await loadExisting(propertyId);
  }

  async function sendAdminMessage() {
    if (!chatMessage.trim() || !propertyId || isNew) return;
    await adminFetch(`/api/admin/properties/${propertyId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: chatMessage.trim(),
        authorName: adminName.trim() || "Роман"
      })
    });
    setChatMessage("");
    await loadExisting(propertyId);
  }

  async function copyClientLink() {
    if (!propertyId || isNew) return;
    const url = `${window.location.origin}/property/${propertyId}`;
    await navigator.clipboard.writeText(url);

    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "client-controls",
        hypothesisId: "H10",
        location: "app/admin/properties/[id]/page.tsx:240",
        message: "Клиентская ссылка скопирована",
        data: {
          propertyId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    setOkMessage("Ссылка для клиента скопирована");
  }

  function logAdminPhotoTap(photoId: string, photoUrl: string) {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "photo-zoom",
        hypothesisId: "H27",
        location: "app/admin/properties/[id]/page.tsx:372",
        message: "Клик по фото в админ-редакторе",
        data: {
          propertyId,
          photoId,
          hasUrl: Boolean(photoUrl)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  return (
    <main className="container">
      <div className="top-actions">
        <div>
          <Link href="/admin">← Назад к списку</Link>
          <h1>{isNew ? "Новый объект" : `Редактор объекта: ${form.title}`}</h1>
        </div>
        <Link href="/" className="top-action-btn">
          К каталогу
        </Link>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="adminKeyEditor">Admin key</label>
          <input
            id="adminKeyEditor"
            type="password"
            value={adminKey}
            onChange={(e) => {
              setAdminKey(e.target.value);
              localStorage.setItem("admin_key", e.target.value);
            }}
          />
        </div>

        <div className="field">
          <label>Название</label>
          <input value={form.title ?? ""} onChange={(e) => updateField("title", e.target.value)} />
        </div>
        <div className="field">
          <label>Локация</label>
          <input value={form.location ?? ""} onChange={(e) => updateField("location", e.target.value)} />
        </div>
        <div className="two-col">
          <div className="field">
            <label>Телефон</label>
            <input
              value={form.contactPhone ?? ""}
              onChange={(e) => updateField("contactPhone", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Ваше имя в чате</label>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </div>
        </div>
        <div className="two-col">
          <div className="field">
            <label>Площадь (м²)</label>
            <input
              type="number"
              value={form.areaM2 ?? 0}
              onChange={(e) => updateField("areaM2", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Ставка</label>
            <input
              type="number"
              value={form.rentRate ?? 0}
              onChange={(e) => updateField("rentRate", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Сервис</label>
            <input
              type="number"
              value={form.serviceRate ?? 0}
              onChange={(e) => updateField("serviceRate", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Итог/мес (опционально)</label>
            <input
              type="number"
              value={form.monthlyTotal ?? ""}
              onChange={(e) =>
                updateField("monthlyTotal", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </div>
          <div className="field">
            <label>Валюта</label>
            <input value={form.currency ?? "USD"} onChange={(e) => updateField("currency", e.target.value)} />
          </div>
          <div className="field">
            <label>Срок</label>
            <input value={form.term ?? ""} onChange={(e) => updateField("term", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Описание</label>
          <textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Приватная заметка (клиент не видит)</label>
          <textarea
            rows={3}
            value={form.privateNote ?? ""}
            onChange={(e) => updateField("privateNote", e.target.value)}
          />
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.visibleToClient)}
              onChange={(e) => updateField("visibleToClient", e.target.checked)}
            />{" "}
            Видим клиенту
          </label>
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.showDocsToClient)}
              onChange={(e) => updateField("showDocsToClient", e.target.checked)}
            />{" "}
            Показывать документы клиенту
          </label>
        </div>
        {!isNew && (
          <div className="field">
            <button type="button" onClick={() => copyClientLink().catch((e) => setError(String(e)))}>
              Скопировать ссылку для клиента
            </button>
          </div>
        )}

        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {okMessage && <p style={{ color: "green" }}>{okMessage}</p>}

        <div className="row">
          <button type="button" onClick={() => saveProperty().catch((e) => setError(String(e)))}>
            Сохранить
          </button>
          {!isNew && (
            <button type="button" onClick={() => deleteProperty().catch((e) => setError(String(e)))}>
              Удалить объект
            </button>
          )}
        </div>
      </div>

      {!isNew && (
        <>
          <section className="card">
            <h2>Фото</h2>
            <div className="field">
              <input type="file" multiple onChange={(e) => setPhotoFiles(e.target.files)} />
            </div>
            <button type="button" onClick={() => uploadPhotos().catch((e) => setError(String(e)))}>
              Загрузить фото
            </button>
            <div className="row" style={{ marginTop: 12 }}>
              {form.photos?.map((photo) => (
                <div key={photo.id} className="card" style={{ width: 220, marginBottom: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="photo"
                    onClick={() => logAdminPhotoTap(photo.id, photo.url)}
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, cursor: "pointer" }}
                  />
                  <button type="button" onClick={() => deletePhoto(photo.id).catch((e) => setError(String(e)))}>
                    Удалить
                  </button>
                  <button type="button" onClick={() => setPhotoAsCover(photo.id).catch((e) => setError(String(e)))}>
                    Сделать обложкой
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePhotoSort(photo.id, Math.max(0, photo.sortOrder - 1)).catch((e) => setError(String(e)))}
                  >
                    Выше
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePhotoSort(photo.id, photo.sortOrder + 1).catch((e) => setError(String(e)))}
                  >
                    Ниже
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Видео (до 5)</h2>
            <div className="field">
              <input type="file" accept="video/*" multiple onChange={(e) => setVideoFiles(e.target.files)} />
            </div>
            <button type="button" onClick={() => uploadVideos().catch((e) => setError(String(e)))}>
              Загрузить видео
            </button>
            <div className="row" style={{ marginTop: 12 }}>
              {form.videos?.map((video) => (
                <div key={video.id} className="card" style={{ width: 280, marginBottom: 0 }}>
                  <video src={video.url} controls preload="metadata" style={{ width: "100%", borderRadius: 6 }} />
                  <p style={{ marginTop: 8, marginBottom: 8 }}>{video.fileName}</p>
                  <button type="button" onClick={() => deleteVideo(video.id).catch((e) => setError(String(e)))}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Документы</h2>
            <div className="field">
              <input type="file" multiple onChange={(e) => setDocFiles(e.target.files)} />
            </div>
            <button type="button" onClick={() => uploadDocs().catch((e) => setError(String(e)))}>
              Загрузить документы
            </button>
            <div>
              {form.docs?.map((doc) => (
                <p key={doc.id}>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.fileName}
                  </a>{" "}
                  <button type="button" onClick={() => deleteDoc(doc.id).catch((e) => setError(String(e)))}>
                    Удалить
                  </button>
                </p>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Чат по объекту</h2>
            {comments.length === 0 && <p>Комментариев пока нет</p>}
            {comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  borderTop: "1px solid #eee",
                  paddingTop: 8,
                  marginTop: 8,
                  textAlign: comment.authorType === "CLIENT" ? "right" : "left"
                }}
              >
                <p>
                  {new Date(comment.createdAt).toLocaleString("ru-RU")} — {comment.authorName || "Пользователь"}
                </p>
                {comment.text && <p>{comment.text}</p>}
                <div>
                  {comment.attachments.map((item) => (
                    <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                      {item.fileName}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <div className="field">
              <textarea
                rows={3}
                placeholder="Ответить в чат..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
            </div>
            <button type="button" onClick={() => sendAdminMessage().catch((e) => setError(String(e)))}>
              Отправить ответ
            </button>
          </section>
        </>
      )}
    </main>
  );
}
