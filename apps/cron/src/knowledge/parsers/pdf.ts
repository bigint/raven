import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

const MAX_PAGES = 500;

export const parsePdf = async (filePath: string): Promise<string> => {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText({ last: MAX_PAGES });
  await parser.destroy();
  return result.text.trim();
};
