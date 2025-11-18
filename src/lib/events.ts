/**
 * Domain Event System
 * Enables loose coupling between services through event-driven architecture
 */

export type DomainEventType =
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'document.embedded'
  | 'collection.created'
  | 'collection.updated'
  | 'collection.deleted'
  | 'search.executed'
  | 'template.created'
  | 'template.executed'
  | 'embedding.job.started'
  | 'embedding.job.completed'
  | 'embedding.job.failed';

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  timestamp: Date;
  data: T;
  metadata?: Record<string, any>;
}

export interface DocumentCreatedEvent extends DomainEvent {
  type: 'document.created';
  data: {
    documentId: number;
    title: string;
    collectionId?: number;
  };
}

export interface DocumentUpdatedEvent extends DomainEvent {
  type: 'document.updated';
  data: {
    documentId: number;
    changes: string[];
  };
}

export interface SearchExecutedEvent extends DomainEvent {
  type: 'search.executed';
  data: {
    query: string;
    resultCount: number;
    latencyMs: number;
    storeName?: string;
  };
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

/**
 * Simple in-memory event bus
 */
export class EventBus {
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize: number = 100;

  /**
   * Register an event handler
   */
  on<T extends DomainEvent = DomainEvent>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
  }

  /**
   * Unregister an event handler
   */
  off(eventType: DomainEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event
   */
  async emit<T extends DomainEvent = DomainEvent>(event: T): Promise<void> {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get handlers for this event type
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Execute all handlers
    const promises = Array.from(handlers).map(handler => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get recent event history
   */
  getHistory(limit?: number): DomainEvent[] {
    return limit
      ? this.eventHistory.slice(-limit)
      : [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: DomainEventType): number {
    return this.handlers.get(eventType)?.size || 0;
  }
}

/**
 * Global event bus instance
 */
export const eventBus = new EventBus();

/**
 * Helper function to create events
 */
export function createEvent<T = any>(
  type: DomainEventType,
  data: T,
  metadata?: Record<string, any>
): DomainEvent<T> {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date(),
    data,
    metadata,
  };
}
