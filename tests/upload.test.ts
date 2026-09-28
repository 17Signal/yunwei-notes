import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteStoredFile,
  resolveStoredFilePath,
  saveUploadedImage,
} from "@/lib/upload";

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "yunwei-upload-"));
  vi.stubEnv("UPLOAD_DIR", root);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(root, { recursive: true, force: true });
});

describe("upload storage boundary", () => {
  it.each([
    "../secret",
    "../../secret",
    "..\\secret",
    "/etc/passwd",
    "C:\\secrets",
    "2026/../../../secret",
    "",
    ".",
    "image.png:stream",
  ])("rejects unsafe path %s", (value) => {
    expect(() => resolveStoredFilePath(value)).toThrow("Unsafe");
  });
  it("rejects sibling directories sharing the root prefix", () => {
    expect(() =>
      resolveStoredFilePath(`../${path.basename(root)}-private/file`),
    ).toThrow();
  });
  it("stores and deletes a valid PNG within the configured root", async () => {
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=",
      "base64",
    );
    const saved = await saveUploadedImage(
      new File([bytes], "截图.png", { type: "image/png" }),
    );
    const target = resolveStoredFilePath(saved.storedPath);
    expect(await fs.readFile(target)).toEqual(bytes);
    await deleteStoredFile(saved.storedPath);
    await expect(fs.stat(target)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(deleteStoredFile(saved.storedPath)).resolves.toBeUndefined();
  });
  it("rejects spoofed MIME types and empty images", async () => {
    await expect(
      saveUploadedImage(
        new File(["<script>alert(1)</script>"], "fake.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("格式不符");
    await expect(
      saveUploadedImage(new File([], "empty.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow("不能为空");
  });
  it("enforces the configured size limit", async () => {
    vi.stubEnv("MAX_UPLOAD_SIZE_MB", "1");
    await expect(
      saveUploadedImage(
        new File([new Uint8Array(1024 * 1024 + 1)], "big.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("limit");
  });
});
