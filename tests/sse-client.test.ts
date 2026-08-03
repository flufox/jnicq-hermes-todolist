import { afterEach, describe, expect, test, vi } from "vitest";

import { subscribeToChanges } from "../src/api";

describe("authenticated SSE client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("backs off when a stream closes cleanly before reconnecting", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const closedStream = new ReadableStream<Uint8Array>({ start: (stream) => stream.close() });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(closedStream, { status: 200 }))
      .mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new Error("test complete"));
      });
    vi.stubGlobal("window", { Telegram: { WebApp: { initData: "synthetic-init-data" } } });
    vi.stubGlobal("fetch", fetchMock);

    const subscription = subscribeToChanges(() => undefined, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await subscription;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
