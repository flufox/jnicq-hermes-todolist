import type { Response } from "express";

export type ChangeEvent = {
  type: "task.changed" | "member.changed" | "integration.changed";
  id: string;
  revision: number;
};

export class EventBus {
  private readonly clients = new Set<Response>();

  subscribe(response: Response): () => void {
    this.clients.add(response);
    return () => this.clients.delete(response);
  }

  publish(event: ChangeEvent): void {
    const payload = `event: ${event.type}\ndata: ${JSON.stringify({ id: event.id, revision: event.revision })}\n\n`;
    for (const response of this.clients) response.write(payload);
  }

  get size(): number {
    return this.clients.size;
  }
}
