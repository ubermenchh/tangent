jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("expo-device", () => ({
    brand: "Google",
    modelName: "Pixel 8",
    osName: "Android",
    osVersion: "14",
    deviceName: "pixel-test",
    isDevice: true,
    deviceType: "PHONE",
}));

jest.mock("expo-battery", () => ({
    BatteryState: {
        UNKNOWN: 0,
        UNPLUGGED: 1,
        CHARGING: 2,
        FULL: 3,
    },
    getBatteryLevelAsync: jest.fn(),
    getBatteryStateAsync: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        })),
    },
}));

import "@/agent/tools/device";
import { toolRegistry } from "@/agent/tools/registry";

const {
    getBatteryLevelAsync: mockGetBatteryLevelAsync,
    getBatteryStateAsync: mockGetBatteryStateAsync,
    BatteryState,
} = jest.requireMock("expo-battery") as {
    getBatteryLevelAsync: jest.Mock;
    getBatteryStateAsync: jest.Mock;
    BatteryState: Record<string, number>;
};

function getExecutor(
    tools: Record<string, { execute?: unknown }>,
    name: string
): (args: Record<string, unknown>) => Promise<unknown> {
    const execute = tools[name]?.execute;
    if (typeof execute !== "function") {
        throw new Error(`Tool "${name}" does not expose execute()`);
    }
    return execute as (args: Record<string, unknown>) => Promise<unknown>;
}

describe("device tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("registers get_device_info and get_battery_status", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        expect(tools.get_device_info).toBeDefined();
        expect(tools.get_battery_status).toBeDefined();
    });

    test("get_device_info returns device metadata", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_device_info")({});

        expect(result).toEqual({
            brand: "Google",
            modelName: "Pixel 8",
            osName: "Android",
            osVersion: "14",
            deviceName: "pixel-test",
            isDevice: true,
            deviceType: "PHONE",
        });
    });

    test("get_battery_status maps charging state and rounds level", async () => {
        mockGetBatteryLevelAsync.mockResolvedValueOnce(0.556);
        mockGetBatteryStateAsync.mockResolvedValueOnce(BatteryState.CHARGING);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_battery_status")({});

        expect(mockGetBatteryLevelAsync).toHaveBeenCalledTimes(1);
        expect(mockGetBatteryStateAsync).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            level: 56,
            state: "charging",
            isCharging: true,
            isFull: false,
        });
    });

    test("get_battery_status handles unknown state fallback", async () => {
        mockGetBatteryLevelAsync.mockResolvedValueOnce(0.01);
        mockGetBatteryStateAsync.mockResolvedValueOnce(999);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_battery_status")({});

        expect(result).toEqual({
            level: 1,
            state: "unknown",
            isCharging: false,
            isFull: false,
        });
    });

    test("get_battery_status marks full state", async () => {
        mockGetBatteryLevelAsync.mockResolvedValueOnce(1);
        mockGetBatteryStateAsync.mockResolvedValueOnce(BatteryState.FULL);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_battery_status")({});

        expect(result).toEqual({
            level: 100,
            state: "full",
            isCharging: false,
            isFull: true,
        });
    });
});