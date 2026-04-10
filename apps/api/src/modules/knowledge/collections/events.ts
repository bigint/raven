import type { BigRAG } from "@bigrag/client";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

export const streamCollectionEvents =
  (bigrag: BigRAG) => async (c: Context) => {
    const name = c.req.param("name") as string;

    return streamSSE(c, async (stream) => {
      try {
        for await (const event of bigrag.collections.streamEvents(name)) {
          await stream.writeSSE({
            data: JSON.stringify(event),
            event: "log"
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
