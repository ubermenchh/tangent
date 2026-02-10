import "@testing-library/react-native/extend-expect";

Object.defineProperty(global, "__DEV__", {
    value: true,
    writable: true,
});

jest.mock("react-native-reanimated", () => {
    const Reanimated = require("react-native-reanimated/mock");
    Reanimated.default.call = () => {};
    return Reanimated;
});

const mockMmkvStore = new Map<string, string | number | boolean>();

jest.mock("react-native-mmkv", () => ({
    createMMKV: () => ({
        getString: (key: string) => {
            const v = mockMmkvStore.get(key);
            return typeof v === "string" ? v : undefined;
        },
        getNumber: (key: string) => {
            const v = mockMmkvStore.get(key);
            return typeof v === "number" ? v : undefined;
        },
        getBoolean: (key: string) => {
            const v = mockMmkvStore.get(key);
            return typeof v === "boolean" ? v : undefined;
        },
        set: (key: string, value: string | number | boolean) => {
            mockMmkvStore.set(key, value);
        },
        remove: (key: string) => {
            mockMmkvStore.delete(key);
        },
        clearAll: () => {
            mockMmkvStore.clear();
        },
    }),
}));

beforeEach(() => {
    mockMmkvStore.clear();
});
