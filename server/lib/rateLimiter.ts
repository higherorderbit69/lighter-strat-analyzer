/**
 * Rate Limiter for API requests
 * Ensures max 5 concurrent requests to prevent rate limit violations
 */

interface QueuedRequest<T> {
    execute: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: unknown) => void;
}

export class RateLimiter {
    private maxConcurrent: number;
    private currentlyRunning: number = 0;
    private queue: QueuedRequest<unknown>[] = [];

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Execute a function with rate limiting
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ execute: fn as () => Promise<unknown>, resolve: resolve as (value: unknown) => void, reject });
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        // If we're at capacity or queue is empty, do nothing
        if (this.currentlyRunning >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        // Take the next request from the queue
        const request = this.queue.shift();
        if (!request) return;

        this.currentlyRunning++;

        try {
            const result = await request.execute();
            request.resolve(result);
        } catch (error) {
            request.reject(error);
        } finally {
            this.currentlyRunning--;
            // Process next item in queue
            this.processQueue();
        }
    }

    /**
     * Get current queue stats (for testing/monitoring)
     */
    getStats() {
        return {
            currentlyRunning: this.currentlyRunning,
            queueLength: this.queue.length,
            maxConcurrent: this.maxConcurrent,
        };
    }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(5);
