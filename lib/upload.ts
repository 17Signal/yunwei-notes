import fs from "node:fs/promises";
import path from "node:path";

import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES, DEFAULT_UPLOAD_DIR } from "@/lib/constants";

export type SavedUpload = {
  originalName: string;
  storedName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
};

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function getMaxUploadSizeBytes(): number {
  const value = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "10", 10);
  const sizeMb = Number.isFinite(value) && value > 0 ? value : 10;
  return sizeMb * 1024 * 1024;
}

export function getUploadRootDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim() || DEFAULT_UPLOAD_DIR;
  return path.resolve(process.cwd(), configured);
}

function getExtensionFromFile(file: File): string {
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };

  const byMime = mimeToExt[file.type];
  if (byMime) {
    return byMime;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}

function ensureImageAllowed(file: File): void {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    throw new UploadValidationError("Only png, jpg, jpeg, and webp are allowed.");
  }

  const ext = getExtensionFromFile(file);
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    throw new UploadValidationError("Invalid file extension.");
  }

  if (file.size > getMaxUploadSizeBytes()) {
    throw new UploadValidationError(`File exceeds ${Math.floor(getMaxUploadSizeBytes() / 1024 / 1024)}MB limit.`);
  }
}

export async function saveUploadedImage(file: File): Promise<SavedUpload> {
  ensureImageAllowed(file);

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = getExtensionFromFile(file);
  const storedName = `${crypto.randomUUID()}.${ext}`;

  const relativeDir = path.posix.join(year, month);
  const relativePath = path.posix.join(relativeDir, storedName);

  const absoluteDir = path.join(getUploadRootDir(), year, month);
  const absolutePath = path.join(absoluteDir, storedName);

  await fs.mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    originalName: file.name,
    storedName,
    storedPath: relativePath,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  const absolutePath = resolveStoredFilePath(relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export function resolveStoredFilePath(relativePath: string): string {
  const normalized = path.posix.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.resolve(getUploadRootDir(), normalized);
  const root = getUploadRootDir();
  if (!fullPath.startsWith(root)) {
    throw new Error("Unsafe file path.");
  }
  return fullPath;
}
