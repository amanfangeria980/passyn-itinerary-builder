import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

let client: S3Client | null = null;

export function r2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function r2Bucket(): string {
  return env("R2_BUCKET");
}

export function r2PublicUrl(key: string): string {
  const base = env("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function r2Put(args: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function r2Get(key: string): Promise<{
  body: Buffer;
  contentType?: string;
  contentLength?: number;
} | null> {
  try {
    const out = await r2Client().send(
      new GetObjectCommand({ Bucket: r2Bucket(), Key: key }),
    );
    const body = out.Body;
    if (!body) return null;
    // @ts-expect-error AWS SDK Body has transformToByteArray in node runtime
    const bytes = await body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: out.ContentType,
      contentLength: out.ContentLength,
    };
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey") return null;
    throw e;
  }
}
