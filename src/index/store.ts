import { createMMKV } from "react-native-mmkv";
import { IndexedFile } from "./types";

const storage = createMMKV({ id: "tangent-index" });
const INDEX_KEY = "file_index";

export const indexStore = {
    getAll(): IndexedFile[] {
        const raw = storage.getString(INDEX_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    save(files: IndexedFile[]): void {
        storage.set(INDEX_KEY, JSON.stringify(files));
    },

    upsert(file: IndexedFile): void {
        const files = this.getAll();
        const idx = files.findIndex(f => f.path === file.path);
        if (idx >= 0) files[idx] = file;
        else files.push(file);
        this.save(files);
    },

    remove(path: string): void {
        this.save(this.getAll().filter(f => f.path !== path));
    },

    clear(): void {
        storage.remove(INDEX_KEY);
    },

    stats() {
        const files = this.getAll();
        return {
            count: files.length,
            lastUpdated: files.length ? Math.max(...files.map(f => f.indexedAt)) : null,
        };
    },
};
