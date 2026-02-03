import { createMMKV } from "react-native-mmkv";
import { StateStorage } from "zustand/middleware";

const storage = createMMKV({ id: "tangent-storage" });

export const mmkvStorage: StateStorage = {
    getItem: name => {
        const value = storage.getString(name);
        return value ?? null;
    },
    setItem: (name, value) => {
        storage.set(name, value);
    },
    removeItem: name => {
        storage.remove(name);
    },
};
