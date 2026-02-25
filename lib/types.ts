export type ApiAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  url: string;
};

export type ApiComment = {
  id: string;
  authorType: "CLIENT" | "ADMIN";
  authorName?: string | null;
  telegramUserId: string;
  text?: string | null;
  createdAt: string;
  attachments: ApiAttachment[];
};

export type ApiPhoto = {
  id: string;
  sortOrder: number;
  filePath: string;
  url: string;
};

export type ApiDoc = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  url: string;
};

export type ApiVideo = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  url: string;
};

export type ApiProperty = {
  id: string;
  title: string;
  location: string;
  contactPhone?: string | null;
  privateNote?: string | null;
  areaM2: number;
  rentRate: number;
  serviceRate: number;
  currency: string;
  monthlyTotal?: number | null;
  term: string;
  description: string;
  visibleToClient: boolean;
  showDocsToClient: boolean;
  photos: ApiPhoto[];
  videos: ApiVideo[];
  docs: ApiDoc[];
  comments: ApiComment[];
};
