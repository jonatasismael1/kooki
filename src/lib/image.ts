const signatures = {
  "image/jpeg": (bytes: Uint8Array) =>
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes: Uint8Array) =>
    bytes
      .slice(0, 8)
      .every(
        (value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index],
      ),
  "image/webp": (bytes: Uint8Array) =>
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP",
} as const;

export type SupportedImageMime = keyof typeof signatures;

export function hasValidImageSignature(mime: string, bytes: Uint8Array) {
  return mime in signatures && signatures[mime as SupportedImageMime](bytes);
}

export async function validateImage(file: File) {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return hasValidImageSignature(file.type, header);
}

export async function compressImage(
  file: File,
  maxSide = 1920,
  quality = 0.82,
) {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type: SupportedImageMime =
    file.type === "image/png" ? "image/png" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  if (!blob) throw new Error("Não foi possível comprimir a foto");
  return new File(
    [blob],
    file.name.replace(/\.[^.]+$/, type === "image/png" ? ".png" : ".webp"),
    { type },
  );
}
