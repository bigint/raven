import { createHash } from "node:crypto";

export const generateETag = (data: unknown): string => {
  const hash = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 16);
  return `"${hash}"`;
};

export const checkIfMatch = (
  ifMatch: string | undefined,
  etag: string
): boolean => {
  if (!ifMatch) return true;
  return ifMatch === etag;
};
