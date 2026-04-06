import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

export const streamDocumentProgress =
  (bigrag: BigRAG) => async (c: Context) => {
    const collectionName = c.req.param("name") as string;
    const docId = c.req.param("docId") as string;

    return streamSSE(c, async (stream) => {
      try {
        for await (const event of bigrag.streamDocumentProgress(
          collectionName,
          docId
        )) {
          await stream.writeSSE({
            data: JSON.stringify(event),
            event: "progress"
          });
        }
      } catch (err) {
        await stream.writeSSE({
          data: JSON.stringify({
            message: String(err),
            progress: 0,
            step: "error"
          }),
          event: "error"
        });
      }
    });
  };
