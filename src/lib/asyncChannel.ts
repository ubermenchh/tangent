/**
 * A simple async channel/queue for passing values between async contexts.
 * Allows pushing values from callbacks and consuming them via async iteration.
 */
export interface AsyncChannel<T> {
    push: (value: T) => void;
    close: () => void;
    [Symbol.asyncIterator]: () => AsyncIterator<T>;
}

export function createAsyncChannel<T>(): AsyncChannel<T> {
    const queue: T[] = [];
    const waiters: Array<(value: IteratorResult<T>) => void> = [];
    let closed = false;

    const push = (value: T) => {
        if (closed) return;

        // If someone is waiting, resolve immediately
        if (waiters.length > 0) {
            const waiter = waiters.shift()!;
            waiter({ value, done: false });
        } else {
            // Otherwise queue it
            queue.push(value);
        }
    };

    const close = () => {
        closed = true;
        // Resolve all waiters with done
        while (waiters.length > 0) {
            const waiter = waiters.shift()!;
            waiter({ value: undefined as T, done: true });
        }
    };

    const asyncIterator = (): AsyncIterator<T> => ({
        next: () =>
            new Promise<IteratorResult<T>>(resolve => {
                // If there's something in the queue, return it
                if (queue.length > 0) {
                    resolve({ value: queue.shift()!, done: false });
                } else if (closed) {
                    // Channel is closed and queue is empty
                    resolve({ value: undefined as T, done: true });
                } else {
                    // Wait for a value
                    waiters.push(resolve);
                }
            }),
    });

    return {
        push,
        close,
        [Symbol.asyncIterator]: asyncIterator,
    };
}
