import { indexStore } from "@/index/store";
import type { IndexedFile } from "@/index/types";

function makeFile(path: string, overrides: Partial<IndexedFile> = {}): IndexedFile {
    const name = path.split("/").pop() || "file.txt";
    const ext = name.includes(".") ? name.split(".").pop() || "txt" : "txt";

    return {
        id: `id_${name}`,
        path,
        name,
        extension: ext,
        size: 100,
        modifiedAt: 1000,
        description: `desc ${name}`,
        embedding: [0.1, 0.2, 0.3],
        indexedAt: 1000,
        ...overrides,
    };
}

describe("indexStore", () => {
    beforeEach(() => {
        indexStore.clear();
    });

    test("getAll returns empty when nothing stored", () => {
        expect(indexStore.getAll()).toEqual([]);
    });

    test("save + getAll round-trip", () => {
        const files = [
            makeFile("/tmp/a.txt", { indexedAt: 1001 }),
            makeFile("/tmp/b.txt", { indexedAt: 1002 }),
        ];

        indexStore.save(files);

        expect(indexStore.getAll()).toEqual(files);
    });

    test("upsert adds new file when path is new", () => {
        const a = makeFile("/tmp/a.txt");

        indexStore.upsert(a);

        expect(indexStore.getAll()).toEqual([a]);
    });

    test("upsert updates existing file by path (no duplicates)", () => {
        const original = makeFile("/tmp/a.txt", {
            id: "old-id",
            description: "old desc",
            indexedAt: 1000,
        });
        const updated = makeFile("/tmp/a.txt", {
            id: "new-id",
            description: "new desc",
            indexedAt: 2000,
        });

        indexStore.save([original]);
        indexStore.upsert(updated);

        const all = indexStore.getAll();
        expect(all).toHaveLength(1);
        expect(all[0]).toEqual(updated);
    });

    test("remove deletes only matching path", () => {
        const a = makeFile("/tmp/a.txt");
        const b = makeFile("/tmp/b.txt");

        indexStore.save([a, b]);
        indexStore.remove("/tmp/a.txt");

        expect(indexStore.getAll()).toEqual([b]);
    });

    test("clear removes all files", () => {
        indexStore.save([makeFile("/tmp/a.txt"), makeFile("/tmp/b.txt")]);
        expect(indexStore.getAll()).toHaveLength(2);

        indexStore.clear();

        expect(indexStore.getAll()).toEqual([]);
    });

    test("stats returns count and latest indexedAt", () => {
        const a = makeFile("/tmp/a.txt", { indexedAt: 500 });
        const b = makeFile("/tmp/b.txt", { indexedAt: 900 });
        const c = makeFile("/tmp/c.txt", { indexedAt: 700 });

        indexStore.save([a, b, c]);

        expect(indexStore.stats()).toEqual({
            count: 3,
            lastUpdated: 900,
        });
    });

    test("stats returns null lastUpdated when empty", () => {
        indexStore.clear();

        expect(indexStore.stats()).toEqual({
            count: 0,
            lastUpdated: null,
        });
    });
});
