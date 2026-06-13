import { getMatchSnapshot } from "@/server/queries/public";

/**
 * Server-Sent Events stream of the live snapshot (backend-spec §7 realtime).
 *
 * Pushes the full snapshot whenever its `version` changes, polling the
 * denormalized row server-side (no per-client DB polling, no WAL realtime).
 * The window is bounded (~25s) so it stays within serverless limits — the
 * browser's EventSource auto-reconnects, and the public hook keeps a slow
 * polling fallback for any gap.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const WINDOW_MS = 25_000;
const TICK_MS = 2_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const onAbort = () => {
        closed = true;
      };
      request.signal.addEventListener("abort", onAbort);

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      // Tell the client how soon to retry after the window closes.
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));

      const initial = await getMatchSnapshot(id);
      if (!initial) {
        send("error", { error: "NOT_FOUND" });
        controller.close();
        return;
      }
      send("snapshot", initial);
      let lastVersion = initial.version;

      const start = Date.now();
      while (!closed && Date.now() - start < WINDOW_MS) {
        await sleep(TICK_MS);
        if (closed) break;
        const snap = await getMatchSnapshot(id);
        if (!snap) break;
        if (snap.version !== lastVersion) {
          send("snapshot", snap);
          lastVersion = snap.version;
        } else {
          send("ping", { t: Date.now() }); // keep the connection warm
        }
        // Once a match is finished there is nothing more to stream.
        if (snap.status === "COMPLETED" || snap.status === "ABANDONED") break;
      }

      request.signal.removeEventListener("abort", onAbort);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
