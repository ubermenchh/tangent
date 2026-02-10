/** @type {import('jest').Config} */
const config = {
    preset: "jest-expo/android",
    testMatch: ["**/?(*.)+(test|spec).(ts|tsx)"],
    setupFilesAfterEnv: ["<rootDir>/test/setup/jest.setup.ts"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
        "!**/*.d.ts",
        "!**/index.ts",
    ],
    coveragePathIgnorePatterns: ["/node_modules/", "/android/", "/test/"],
    transformIgnorePatterns: [
        "node_modules/(?!(react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-google-fonts/.*|@react-navigation/.*|react-native-reanimated|react-native-css-interop|nativewind)/)",
    ],
};

module.exports = config;