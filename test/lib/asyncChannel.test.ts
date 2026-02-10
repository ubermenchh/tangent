import { createAsyncChannel } from "@/lib/asyncChannel";

describe("createAsyncChannel", () => {
    test("yields pushed values in order", async () => {
        const ch = createAsyncChannel<number>();
        const it = ch[Symbol.asyncIterator]();

        ch.push(1);
        ch.push(2);

        await expect(it.next()).resolves.toEqual({ value: 1, done: false });
        await expect(it.next()).resolves.toEqual({ value: 2, done: false });
    });

    test("delivers immediately to waiting consumer", async () => {
        const ch = createAsyncChannel<string>();
        const it = ch[Symbol.asyncIterator]();

        const pending = it.next(); // waiter queued
        ch.push("hello");

        await expect(pending).resolves.toEqual({ value: "hello", done: false });
    });

    test("close resolves pending waiter with done=true", async () => {
        const ch = createAsyncChannel<number>();
        const it = ch[Symbol.asyncIterator]();

        const pending = it.next();
        ch.close();

        await expect(pending).resolves.toEqual({ value: undefined, done: true });
    });

    test("after close, next() returns done=true", async () => {
        const ch = createAsyncChannel<number>();
        const it = ch[Symbol.asyncIterator]();

        ch.close();

        await expect(it.next()).resolves.toEqual({ value: undefined, done: true });
        await expect(it.next()).resolves.toEqual({ value: undefined, done: true });
    });

    test("close after queue drains queued values first", async () => {
        const ch = createAsyncChannel<number>();
        const it = ch[Symbol.asyncIterator]();

        ch.push(10);
        ch.push(20);
        ch.close();

        await expect(it.next()).resolves.toEqual({ value: 10, done: false });
        await expect(it.next()).resolves.toEqual({ value: 20, done: false });
        await expect(it.next()).resolves.toEqual({ value: undefined, done: true });
    });

    test("push after close is ignored", async () => {
        const ch = createAsyncChannel<number>();
        const it = ch[Symbol.asyncIterator]();

        ch.close();
        ch.push(99);

        await expect(it.next()).resolves.toEqual({ value: undefined, done: true });
    });

    test("works with for-await loop", async () => {
        const ch = createAsyncChannel<number>();
        const values: number[] = [];

        const consumer = (async () => {
            for await (const v of ch) {
                values.push(v);
            }
        })();

        ch.push(1);
        ch.push(2);
        ch.push(3);
        ch.close();

        await consumer;
        expect(values).toEqual([1, 2, 3]);
    });
});