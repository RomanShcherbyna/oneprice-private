import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export type SavedFile = {
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureUploadsDir(): Promise<string> {
  const absolute = path.resolve(process.cwd(), env.uploadsDir);
  await fs.mkdir(absolute, { recursive: true });
  return absolute;
}

export async function saveWebFile(file: File, subDir: string): Promise<SavedFile> {
  const maxSizeBytes = env.maxUploadSizeMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File too large: ${file.name}`);
  }

  const uploadsRoot = await ensureUploadsDir();
  const targetDir = path.join(uploadsRoot, subDir);
  await fs.mkdir(targetDir, { recursive: true });

  const safeOriginal = sanitizeFileName(file.name || "file");
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeOriginal}`;
  const absTarget = path.join(targetDir, uniqueName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absTarget, buffer);

  const relative = path.relative(uploadsRoot, absTarget).split(path.sep).join("/");

  return {
    originalName: safeOriginal,
    storedPath: relative,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size
  };
}

export function toFileUrl(storedPath: string): string {
  return `/api/files/${storedPath}`;
}

export function uploadsAbsolutePath(storedPath: string): string {
  return path.join(path.resolve(process.cwd(), env.uploadsDir), storedPath);
}
