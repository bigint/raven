import { readFile } from "node:fs/promises";
import OpenAI from "openai";

export const parseImage = async (
  filePath: string,
  apiKey: string
): Promise<string> => {
  const buffer = await readFile(filePath);
  const base64 = buffer.toString("base64");
  const mimeType = filePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    max_tokens: 4096,
    messages: [
      {
        content: [
          {
            text: "Extract all text content from this image. Preserve the structure, headings, lists, and formatting as much as possible. Return only the extracted text, nothing else.",
            type: "text"
          },
          {
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            },
            type: "image_url"
          }
        ],
        role: "user"
      }
    ],
    model: "gpt-4o"
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("OCR extraction returned empty result");
  }

  return text.trim();
};
