"use client";

import { FormEvent, useMemo, useState } from "react";
import { ApiProperty } from "@/lib/types";

type Props = {
  item: ApiProperty;
  telegramUserId: string;
  telegramUsername: string;
  onCommentCreated: (propertyId: string) => Promise<void>;
};

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("ru-RU");
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = text.split("\n");
  return lines.map((line, lineIndex) => {
    const parts = line.split(urlRegex);
    return (
      <span key={`line-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          if (/^https?:\/\//.test(part)) {
            return (
              <a key={`part-${partIndex}`} href={part} target="_blank" rel="noreferrer">
                {part}
              </a>
            );
          }
          return <span key={`part-${partIndex}`}>{part}</span>;
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

export function PropertyCard({ item, telegramUserId, telegramUsername, onCommentCreated }: Props) {
  const [isSending, setIsSending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");

  const sortedPhotos = useMemo(
    () => [...item.photos].sort((a, b) => a.sortOrder - b.sortOrder),
    [item.photos]
  );

  function logClientPhotoTap(photoId: string, photoUrl: string) {
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
        hypothesisId: "H26",
        location: "components/PropertyCard.tsx:54",
        message: "Клик по фото на клиентской карточке",
        data: {
          propertyId: item.id,
          photoId,
          hasUrl: Boolean(photoUrl)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  function logClientVideoPlay(videoId: string) {
    // #region agent log
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "video-upload",
        hypothesisId: "H29",
        location: "components/PropertyCard.tsx:80",
        message: "Старт воспроизведения видео на клиенте",
        data: {
          propertyId: item.id,
          videoId
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSending(true);

    try {
      const form = new FormData();
      form.set("text", commentText);
      form.set("authorName", telegramUsername || "Роман");
      if (files) {
        Array.from(files).forEach((file) => form.append("attachments", file));
      }

      const res = await fetch(`/api/client/properties/${item.id}/comments`, {
        method: "POST",
        headers: {
          "x-telegram-user-id": telegramUserId
        },
        body: form
      });

      if (!res.ok) {
        throw new Error("Не удалось отправить комментарий");
      }

      setCommentText("");
      setFiles(null);
      const input = event.currentTarget.elements.namedItem("attachments") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      await onCommentCreated(item.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ошибка отправки");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteOwnComment(commentId: string) {
    setDeletingCommentId(commentId);
    setError("");
    try {
      const res = await fetch(`/api/client/properties/${item.id}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "x-telegram-user-id": telegramUserId
        }
      });
      if (!res.ok) {
        throw new Error("Не удалось удалить комментарий");
      }
      await onCommentCreated(item.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Ошибка удаления");
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <article className="card">
      <h3>{item.title}</h3>
      <p>{renderTextWithLinks(item.description)}</p>

      <div style={{ overflowX: "auto", display: "flex", gap: 8, marginBottom: 12 }}>
        {sortedPhotos.length > 0 ? (
          sortedPhotos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={photo.url}
              alt={item.title}
              onClick={() => logClientPhotoTap(photo.id, photo.url)}
              style={{ width: 240, height: 150, objectFit: "cover", borderRadius: 8, cursor: "pointer" }}
            />
          ))
        ) : (
          <p>Фото пока нет</p>
        )}
      </div>

      {item.videos.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>Видео</strong>
          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {item.videos.map((video) => (
              <video
                key={video.id}
                src={video.url}
                controls
                preload="metadata"
                style={{ width: "100%", borderRadius: 8, background: "#000" }}
                onPlay={() => logClientVideoPlay(video.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="card" style={{ marginBottom: 0 }}>
          <strong>Параметры</strong>
          <p>Локация: {item.location}</p>
          <p>Площадь: {item.areaM2} м²</p>
          <p>Ставка: {formatMoney(item.rentRate)}</p>
          <p>Сервис: {formatMoney(item.serviceRate)}</p>
          <p>Итог/мес: {formatMoney(item.monthlyTotal)}</p>
          <p>Срок: {item.term}</p>
        </div>

        {item.showDocsToClient && (
          <div className="card" style={{ marginBottom: 0 }}>
            <strong>Документы</strong>
            {item.docs.length === 0 && <p>Документы пока не загружены</p>}
            {item.docs.map((doc) => (
              <p key={doc.id}>
                <a href={doc.url} target="_blank" rel="noreferrer">
                  {doc.fileName}
                </a>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 0 }}>
        <strong>Чат по объекту</strong>
        {item.comments.length === 0 && <p>Комментариев пока нет</p>}
        {item.comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              borderTop: "1px solid #eee",
              paddingTop: 8,
              marginTop: 8,
              textAlign: comment.authorType === "CLIENT" ? "right" : "left"
            }}
          >
            <p style={{ margin: 0 }}>
              {new Date(comment.createdAt).toLocaleString("ru-RU")} {comment.authorName || ""}
            </p>
            {comment.text && <p>{comment.text}</p>}
            {comment.attachments.length > 0 && (
              <div>
                {comment.attachments.map((attachment) => (
                  <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                    {attachment.fileName}
                  </a>
                ))}
              </div>
            )}
            {comment.authorType === "CLIENT" && comment.telegramUserId === telegramUserId && (
              <button
                type="button"
                disabled={deletingCommentId === comment.id}
                onClick={() => handleDeleteOwnComment(comment.id)}
              >
                {deletingCommentId === comment.id ? "Удаление..." : "Удалить"}
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 12, marginBottom: 0 }}>
        <strong>Написать сообщение</strong>
        <div className="field">
          <textarea
            name="text"
            placeholder="Комментарий (опционально)"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor={`attachments-${item.id}`}>Скрепка (вложения: файл/скрин/фото)</label>
          <input
            id={`attachments-${item.id}`}
            name="attachments"
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={isSending}>
          {isSending ? "Отправка..." : "Отправить"}
        </button>
      </form>
    </article>
  );
}
