import { createMMKV } from "react-native-mmkv";
import { IndexedFile } from "./types";
import { logger } from "@/lib/logger";

const log = logger.create("IndexStore");

const storage = createMMKV({ id: "tangent-index" });
const INDEX_KEY = "file_index";

export const indexStore = {
    getAll(): IndexedFile[] {
        const raw = storage.getString(INDEX_KEY);
        const files = raw ? JSON.parse(raw) : [];
        log.debug(`getAll: ${files.length} files`);
        return files;
    },

    save(files: IndexedFile[]): void {
        log.debug(`Saving ${files.length} files to storage`);
        storage.set(INDEX_KEY, JSON.stringify(files));
    },

    upsert(file: IndexedFile): void {
        const files = this.getAll();
        const idx = files.findIndex(f => f.path === file.path);
        if (idx >= 0) {
            log.debug(`Updating existing file: ${file.name}`);
            files[idx] = file;
        } else {
            log.debug(`Adding new file: ${file.name}`);
            files.push(file);
        }
        this.save(files);
    },

    remove(path: string): void {
        log.debug(`Removing file: ${path}`);
        this.save(this.getAll().filter(f => f.path !== path));
    },

    clear(): void {
        log.info("Clearing all indexed files");
        storage.remove(INDEX_KEY);
    },

    stats() {
        const files = this.getAll();
        const stats = {
            count: files.length,
            lastUpdated: files.length ? Math.max(...files.map(f => f.indexedAt)) : null,
        };
        log.debug("Index stats:", stats);
        return stats;
    },
};
