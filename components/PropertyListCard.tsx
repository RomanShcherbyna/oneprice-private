"use client";
import { ApiProperty } from "@/lib/types";

type Props = {
  item: ApiProperty;
  telegramUserId: string;
  telegramUsername: string;
};

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function PropertyListCard({ item, telegramUserId, telegramUsername }: Props) {
  const coverPhoto = item.photos[0]?.url ?? "";
  const detailUrl = `/property/${item.id}?telegramUserId=${encodeURIComponent(telegramUserId)}&telegramUsername=${encodeURIComponent(telegramUsername)}`;

  // #region agent log
  function logOpen() {
    fetch("http://127.0.0.1:7610/ingest/6600c07e-52da-43ef-945d-ea1cfcdee3ca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7c18f5"
      },
      body: JSON.stringify({
        sessionId: "7c18f5",
        runId: "ui-v2",
        hypothesisId: "H2",
        location: "components/PropertyListCard.tsx:27",
        message: "Открытие детали объекта из списка",
        data: {
          propertyId: item.id
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
  // #endregion

  return (
    <a href={detailUrl} className="catalog-card" onClick={logOpen}>
      <div className="catalog-card__image-wrap">
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="catalog-card__image" src={coverPhoto} alt={item.title} />
        ) : (
          <div className="catalog-card__image-empty">Нет фото</div>
        )}
      </div>
      <div className="catalog-card__content">
        <h3 className="catalog-card__title">{item.title}</h3>
        <p className="catalog-card__location">{item.location}</p>
        <div className="catalog-card__meta">
          <span>{item.areaM2} м²</span>
          <span>{formatMoney(item.rentRate)}</span>
        </div>
      </div>
    </a>
  );
}
