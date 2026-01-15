export interface IndexConfig {
    folders: string[];
    fileTypes: string[];
    maxFileSizeMB: number;
    maxFiles: number;
}

export interface IndexedFile {
    id: string;
    path: string;
    name: string;
    extension: string;
    size: number;
    modifiedAt: number;
    description: string;
    embedding: number[];
    indexedAt: number;
}

export interface SearchResult {
    file: IndexedFile;
    score: number;
}

export const DEFAULT_INDEX_CONFIG: IndexConfig = {
    folders: [],
    fileTypes: [
        ".txt",
        ".md",
        ".pdf",
        ".doc",
        ".docx",
        ".xlsx",
        ".pptx",
        ".jpg",
        ".jpeg",
        ".png",
        ".heic",
        ".webp",
    ],
    maxFileSizeMB: 10,
    maxFiles: 1000,
};
