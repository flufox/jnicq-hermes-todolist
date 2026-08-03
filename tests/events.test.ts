import { describe, expect, test } from "vitest";
import type { Response } from "express";
import { EventBus } from "../server-src/events.js";

describe("authenticated change stream payloads", () => {
  test("publishes only an event type, resource id, and revision", () => {
    const chunks: string[] = [];
    const response = { write: (chunk: string) => chunks.push(chunk) } as unknown as Response;
    const events = new EventBus();
    const unsubscribe = events.subscribe(response);

    events.publish({ type: "task.changed", id: "task-1", revision: 42 });

    expect(chunks).toEqual(['event: task.changed\ndata: {"id":"task-1","revision":42}\n\n']);
    expect(chunks[0]).not.toContain("title");
    unsubscribe();
    expect(events.size).toBe(0);
  });
});
