import { readFile } from "node:fs/promises";
import mammoth from "mammoth";

export const parseDocx = async (filePath: string): Promise<string> => {
  const buffer = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
};
