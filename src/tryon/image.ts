export async function fetchAndNormalizeGarment(url: string): Promise<Blob> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("The selected product image has an unsupported URL.");
  }

  const response = await fetch(parsed.href, { credentials: "omit" });
  if (!response.ok) throw new Error(`Product image request failed (${response.status}).`);

  const type = response.headers.get("content-type") ?? "";
  if (type && !type.startsWith("image/")) throw new Error("The selected URL is not an image.");

  const blob = await response.blob();
  if (blob.size > 12 * 1024 * 1024) throw new Error("The product image is larger than 12 MB.");
  return normalizeImage(blob);
}

export async function normalizeImage(blob: Blob, outputSize = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);

  const scale = Math.min(outputSize / bitmap.width, outputSize / bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  context.drawImage(bitmap, (outputSize - width) / 2, (outputSize - height) / 2, width, height);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not prepare the garment image."))),
      "image/jpeg",
      0.9,
    );
  });
}
