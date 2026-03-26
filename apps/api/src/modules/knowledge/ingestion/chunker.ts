interface ChunkOptions {
  readonly strategy: "fixed" | "semantic" | "hybrid";
  readonly chunkSize: number;
  readonly chunkOverlap: number;
}

interface Chunk {
  readonly content: string;
  readonly index: number;
  readonly tokenCount: number;
}

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const semanticSplit = (text: string): string[] => {
  const sections = text.split(/(?=^#{1,6}\s)/m);
  const result: string[] = [];
  for (const section of sections) {
    const paragraphs = section.split(/\n{2,}/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 0) {
        result.push(trimmed);
      }
    }
  }
  return result;
};

const fixedSplit = (
  text: string,
  chunkSize: number,
  overlap: number
): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  const wordsPerChunk = Math.floor(chunkSize * 0.75);
  const overlapWords = Math.floor(overlap * 0.75);
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlapWords;
    if (start >= end) break;
  }
  return chunks;
};

const hybridSplit = (
  text: string,
  chunkSize: number,
  overlap: number
): string[] => {
  const sections = semanticSplit(text);
  const result: string[] = [];
  for (const section of sections) {
    const tokens = estimateTokens(section);
    if (tokens <= chunkSize) {
      result.push(section);
    } else {
      result.push(...fixedSplit(section, chunkSize, overlap));
    }
  }
  return result;
};

const MIN_CHUNK_WORDS = 5;

const cleanAndFilter = (segments: string[]): string[] =>
  segments
    .map((s) =>
      s
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter((s) => {
      const words = s.split(/\s+/).length;
      return words >= MIN_CHUNK_WORDS;
    });

export const chunkText = (text: string, options: ChunkOptions): Chunk[] => {
  const { strategy, chunkSize, chunkOverlap } = options;
  let segments: string[];
  switch (strategy) {
    case "fixed":
      segments = fixedSplit(text, chunkSize, chunkOverlap);
      break;
    case "semantic":
      segments = semanticSplit(text);
      break;
    case "hybrid":
      segments = hybridSplit(text, chunkSize, chunkOverlap);
      break;
  }
  return cleanAndFilter(segments).map((content, index) => ({
    content,
    index,
    tokenCount: estimateTokens(content)
  }));
};
