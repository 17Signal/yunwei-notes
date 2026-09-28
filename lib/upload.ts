import fs from "node:fs/promises";
import path from "node:path";

import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  DEFAULT_UPLOAD_DIR,
} from "@/lib/constants";

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

export function getMaxUploadSizeBytes(): number {
  const value = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "10", 10);
  const sizeMb = Number.isFinite(value) && value > 0 ? value : 10;
  return sizeMb * 1024 * 1024;
}

export function getUploadRootDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim() || DEFAULT_UPLOAD_DIR;
  // Uploads are runtime data on a mounted volume, never build inputs.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), configured);
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
    throw new UploadValidationError(
      "Only png, jpg, jpeg, and webp are allowed.",
    );
  }

  const ext = getExtensionFromFile(file);
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    throw new UploadValidationError("Invalid file extension.");
  }

  if (file.size > getMaxUploadSizeBytes()) {
    throw new UploadValidationError(
      `File exceeds ${Math.floor(getMaxUploadSizeBytes() / 1024 / 1024)}MB limit.`,
    );
  }
  if (file.size === 0) throw new UploadValidationError("图片文件不能为空。");
}

export async function saveUploadedImage(file: File): Promise<SavedUpload> {
  ensureImageAllowed(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const validSignature =
    file.type === "image/png"
      ? buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.type === "image/jpeg"
        ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        : buffer.toString("ascii", 0, 4) === "RIFF" &&
          buffer.toString("ascii", 8, 12) === "WEBP";
  if (!validSignature)
    throw new UploadValidationError("文件内容与图片格式不符。");

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = getExtensionFromFile(file);
  const storedName = `${crypto.randomUUID()}.${ext}`;

  const relativeDir = path.posix.join(year, month);
  const relativePath = path.posix.join(relativeDir, storedName);

  const absoluteDir = path.join(
    /* turbopackIgnore: true */ getUploadRootDir(),
    year,
    month,
  );
  const absolutePath = path.join(
    /* turbopackIgnore: true */ absoluteDir,
    storedName,
  );

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return {
    originalName: file.name.slice(0, 255),
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
  const root = getUploadRootDir();
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    /[\\:\x00]/.test(relativePath)
  ) {
    throw new Error("Unsafe file path.");
  }
  const fullPath = path.resolve(/* turbopackIgnore: true */ root, relativePath);
  const relative = path.relative(root, fullPath);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Unsafe file path.");
  }
  return fullPath;
}
