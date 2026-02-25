import {
  ClientComment,
  CommentAttachment,
  Property,
  PropertyDoc,
  PropertyPhoto,
  PropertyVideo
} from "@prisma/client";
import { toFileUrl } from "@/lib/upload";

type PropertyWithRelations = Property & {
  photos: PropertyPhoto[];
  videos?: PropertyVideo[];
  docs: PropertyDoc[];
  comments?: (ClientComment & { attachments: CommentAttachment[] })[];
};

export function serializeProperty(
  property: PropertyWithRelations,
  options?: { includePrivateFields?: boolean }
) {
  const includePrivateFields = Boolean(options?.includePrivateFields);
  const docs = property.showDocsToClient || includePrivateFields ? property.docs : [];

  return {
    id: property.id,
    title: property.title,
    location: property.location,
    ...(includePrivateFields ? { contactPhone: property.contactPhone, privateNote: property.privateNote } : {}),
    areaM2: property.areaM2,
    rentRate: property.rentRate,
    serviceRate: property.serviceRate,
    currency: property.currency,
    monthlyTotal: property.monthlyTotal,
    term: property.term,
    description: property.description,
    visibleToClient: property.visibleToClient,
    showDocsToClient: property.showDocsToClient,
    photos: property.photos
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        id: photo.id,
        sortOrder: photo.sortOrder,
        filePath: photo.filePath,
        url: toFileUrl(photo.filePath)
      })),
    videos: (property.videos ?? []).map((video) => ({
      id: video.id,
      fileName: video.fileName,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      filePath: video.filePath,
      url: toFileUrl(video.filePath)
    })),
    docs: docs.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      filePath: doc.filePath,
      url: toFileUrl(doc.filePath)
    })),
    comments:
      property.comments?.map((comment) => ({
        id: comment.id,
        authorType: comment.authorType,
        authorName: comment.authorName,
        telegramUserId: comment.telegramUserId,
        text: comment.text,
        createdAt: comment.createdAt,
        attachments: comment.attachments.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          filePath: item.filePath,
          url: toFileUrl(item.filePath)
        }))
      })) ?? []
  };
}
