import { readFile } from "node:fs/promises";

export const parseMarkdown = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath, "utf-8");
  return content.trim();
};
