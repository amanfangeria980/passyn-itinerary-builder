import sharp from "sharp";
import { randomBytes } from "node:crypto";

export const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGES_PER_ITINERARY = 20;

export type ProcessedImage = {
  full: { buffer: Buffer; mime: "image/webp"; width: number; height: number; bytes: number };
  thumb: { buffer: Buffer; mime: "image/webp"; width: number; height: number; bytes: number };
};

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // Strip EXIF, normalise to webp, cap full at 2000px wide.
  const baseImg = sharp(input, { failOn: "none" }).rotate(); // honour EXIF orientation, then drop metadata
  const meta = await baseImg.metadata();

  const fullBuf = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumbBuf = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer({ resolveWithObject: true });

  return {
    full: {
      buffer: fullBuf.data,
      mime: "image/webp",
      width: fullBuf.info.width,
      height: fullBuf.info.height,
      bytes: fullBuf.data.byteLength,
    },
    thumb: {
      buffer: thumbBuf.data,
      mime: "image/webp",
      width: thumbBuf.info.width,
      height: thumbBuf.info.height,
      bytes: thumbBuf.data.byteLength,
    },
  };
}

export function newAssetKey(itineraryId: string, kind: "full" | "thumb"): string {
  const id = randomBytes(8).toString("hex");
  return `itineraries/${itineraryId}/${kind}/${id}.webp`;
}
