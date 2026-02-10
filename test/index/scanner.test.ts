jest.mock("expo-file-system/next", () => {
    const mockDirItems = new Map<string, unknown[]>();

    class File {
        uri: string;
        name: string;
        size: number;

        constructor(uri: string, size = 0) {
            this.uri = uri;
            this.size = size;
            this.name = uri.split("/").pop() || "";
        }
    }

    class Directory {
        uri: string;

        constructor(uri: string) {
            this.uri = uri;
        }

        async list(): Promise<unknown[]> {
            const items = mockDirItems.get(this.uri);
            if (!items) {
                throw new Error(`No mock listing for ${this.uri}`);
            }
            return items;
        }
    }

    return {
        File,
        Directory,
        __setMockDirItems: (uri: string, items: unknown[]) => {
            mockDirItems.set(uri, items);
        },
        __resetMockFs: () => {
            mockDirItems.clear();
        },
    };
});

import { scanFolders } from "@/index/scanner";
import type { IndexConfig } from "@/index/types";

type MockFsModule = {
    File: new (uri: string, size?: number) => { uri: string; name: string; size: number };
    Directory: new (uri: string) => { uri: string };
    __setMockDirItems: (uri: string, items: unknown[]) => void;
    __resetMockFs: () => void;
};

const {
    File: MockFile,
    Directory: MockDirectory,
    __setMockDirItems,
    __resetMockFs,
} = jest.requireMock("expo-file-system/next") as MockFsModule;

const toUri = (path: string) => (path.startsWith("file://") ? path : `file://${path}`);

const baseConfig: IndexConfig = {
    folders: ["/root"],
    fileTypes: ["txt", "json"],
    maxFileSizeMB: 1, // 1 MB
    maxFiles: 100,
};

describe("scanFolders", () => {
    beforeEach(() => {
        __resetMockFs();
        jest.spyOn(Date, "now").mockReturnValue(1234567890);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("scans recursively and filters by extension and size", async () => {
        __setMockDirItems(toUri("/root"), [
            new MockFile("file:///root/a.txt", 100),
            new MockFile("file:///root/photo.jpg", 100), // filtered by extension
            new MockDirectory("file:///root/sub"),
        ]);

        __setMockDirItems("file:///root/sub", [
            new MockFile("file:///root/sub/c.JSON", 200), // extension lowercased to json
            new MockFile("file:///root/sub/big.txt", 2 * 1024 * 1024), // filtered by size
        ]);

        const results = await scanFolders(baseConfig);

        expect(results.map(f => f.path)).toEqual(["file:///root/a.txt", "file:///root/sub/c.JSON"]);
        expect(results.map(f => f.extension)).toEqual(["txt", "json"]);
        expect(results.every(f => f.modifiedAt === 1234567890)).toBe(true);
    });

    test("respects maxFiles and stops scanning subsequent folders", async () => {
        const config: IndexConfig = {
            folders: ["/one", "/two"],
            fileTypes: ["txt"],
            maxFileSizeMB: 10,
            maxFiles: 2,
        };

        __setMockDirItems(toUri("/one"), [
            new MockFile("file:///one/1.txt", 10),
            new MockFile("file:///one/2.txt", 10),
            new MockFile("file:///one/3.txt", 10),
        ]);

        // Intentionally no listing for /two; test should not reach it once maxFiles hit.
        const onProgress = jest.fn();

        const results = await scanFolders(config, onProgress);

        expect(results).toHaveLength(2);
        expect(results.every(f => f.path.startsWith("file:///one/"))).toBe(true);
        expect(onProgress).toHaveBeenCalledTimes(1);
    });

    test("handles inaccessible folders gracefully", async () => {
        const config: IndexConfig = {
            folders: ["/missing"],
            fileTypes: ["txt"],
            maxFileSizeMB: 10,
            maxFiles: 10,
        };

        await expect(scanFolders(config)).resolves.toEqual([]);
    });

    test("does not scan deeper than depth 5", async () => {
        __setMockDirItems("file:///root", [new MockDirectory("file:///root/d1")]);
        __setMockDirItems("file:///root/d1", [new MockDirectory("file:///root/d1/d2")]);
        __setMockDirItems("file:///root/d1/d2", [new MockDirectory("file:///root/d1/d2/d3")]);
        __setMockDirItems("file:///root/d1/d2/d3", [new MockDirectory("file:///root/d1/d2/d3/d4")]);
        __setMockDirItems("file:///root/d1/d2/d3/d4", [
            new MockDirectory("file:///root/d1/d2/d3/d4/d5"),
        ]);

        // depth = 5
        __setMockDirItems("file:///root/d1/d2/d3/d4/d5", [
            new MockFile("file:///root/d1/d2/d3/d4/d5/at_depth5.txt", 10),
            new MockDirectory("file:///root/d1/d2/d3/d4/d5/d6"),
        ]);

        // depth = 6 (should not be scanned due to guard)
        __setMockDirItems("file:///root/d1/d2/d3/d4/d5/d6", [
            new MockFile("file:///root/d1/d2/d3/d4/d5/d6/too_deep.txt", 10),
        ]);

        const config: IndexConfig = {
            folders: ["/root"],
            fileTypes: ["txt"],
            maxFileSizeMB: 10,
            maxFiles: 100,
        };

        const results = await scanFolders(config);
        const names = results.map(f => f.name);

        expect(names).toContain("at_depth5.txt");
        expect(names).not.toContain("too_deep.txt");
    });

    test("accepts folder URIs that already start with file://", async () => {
        const config: IndexConfig = {
            folders: ["file:///uriRoot"],
            fileTypes: ["txt"],
            maxFileSizeMB: 10,
            maxFiles: 10,
        };

        __setMockDirItems("file:///uriRoot", [new MockFile("file:///uriRoot/x.txt", 10)]);

        const results = await scanFolders(config);

        expect(results).toHaveLength(1);
        expect(results[0].path).toBe("file:///uriRoot/x.txt");
    });
});