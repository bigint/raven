import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export const parsePdf = async (filePath: string): Promise<string> => {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text.trim();
};
