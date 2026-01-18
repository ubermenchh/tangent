import { Directory, File } from "expo-file-system/next";
import { IndexConfig } from "./types";

export interface ScannedFile {
    path: string;
    name: string;
    extension: string;
    size: number;
    modifiedAt: number;
}

export async function scanFolders(
    config: IndexConfig,
    onProgress?: (current: number, total: number) => void
): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    const maxSize = config.maxFileSizeMB * 1024 * 1024;

    for (const folder of config.folders) {
        await scanDirectory(folder, files, config, maxSize, 0);
        if (onProgress) {
            onProgress(files.length, config.maxFiles);
        }
        if (files.length >= config.maxFiles) break;
    }
    return files.slice(0, config.maxFiles);
}

async function scanDirectory(
    dirPath: string,
    files: ScannedFile[],
    config: IndexConfig,
    maxSize: number,
    depth: number
): Promise<void> {
    if (depth > 5 || files.length >= config.maxFiles) return;

    try {
        const uri = dirPath.startsWith("file://") ? dirPath : `file://${dirPath}`;
        const directory = new Directory(uri);
        const items = await directory.list();

        console.log(`Directory ${dirPath}: found ${items.length} items`);
        for (const item of items) {
            if (item instanceof File) {
                const ext = item.name.split(".").pop()?.toLowerCase() || "";
                if (config.fileTypes.includes(ext)) {
                    const size = item.size;
                    if (size <= maxSize) {
                        files.push({
                            path: item.uri,
                            name: item.name,
                            extension: ext,
                            size: size,
                            modifiedAt: Date.now(),
                        });
                    }
                }
            } else if (item instanceof Directory) {
                await scanDirectory(item.uri, files, config, maxSize, depth + 1);
            }
        }
    } catch (error) {
        console.warn(`Cannot access directory: ${dirPath}`, error);
    }
}
