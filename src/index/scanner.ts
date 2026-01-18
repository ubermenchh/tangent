import { Directory, File } from "expo-file-system/next";
import { IndexConfig } from "./types";
import { logger } from "@/lib/logger";

const log = logger.create("Scanner");

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

    log.info(`Starting scan of ${config.folders.length} folders`, {
        folders: config.folders,
        fileTypes: config.fileTypes,
        maxFiles: config.maxFiles,
        maxSizeMB: config.maxFileSizeMB,
    });

    const startTime = Date.now();

    for (const folder of config.folders) {
        log.debug(`Scanning folder: ${folder}`);
        await scanDirectory(folder, files, config, maxSize, 0);
        if (onProgress) {
            onProgress(files.length, config.maxFiles);
        }
        if (files.length >= config.maxFiles) {
            log.warn(`Max files limit reached (${config.maxFiles}), stopping scan`);
            break;
        }
    }

    const duration = Date.now() - startTime;
    log.info(`Scan complete: ${files.length} files in ${duration}ms`);

    const byExt = files.reduce(
        (acc, f) => {
            acc[f.extension] = (acc[f.extension] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
    log.debug("Files by extension:", byExt);

    return files.slice(0, config.maxFiles);
}

async function scanDirectory(
    dirPath: string,
    files: ScannedFile[],
    config: IndexConfig,
    maxSize: number,
    depth: number
): Promise<void> {
    if (depth > 5) {
        log.debug(`Max depth reached at: ${dirPath}`);
        return;
    }
    if (files.length >= config.maxFiles) return;

    try {
        const uri = dirPath.startsWith("file://") ? dirPath : `file://${dirPath}`;
        const directory = new Directory(uri);
        const items = await directory.list();

        log.debug(`${dirPath}: ${items.length} items (depth=${depth})`);

        let filesFound = 0;
        let dirsFound = 0;
        let skippedSize = 0;
        let skippedType = 0;

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
                        filesFound++;
                    } else {
                        skippedSize++;
                    }
                } else {
                    skippedType++;
                }
            } else if (item instanceof Directory) {
                dirsFound++;
                await scanDirectory(item.uri, files, config, maxSize, depth + 1);
            }
        }

        if (depth <= 1) {
            log.debug(
                `${dirPath}: found ${filesFound} files, ${dirsFound} subdirs, skipped ${skippedSize} (size), ${skippedType} (type)`
            );
        }
    } catch (error) {
        log.warn(`Cannot access directory: ${dirPath}`, error);
    }
}
