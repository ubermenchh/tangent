import * as Device from "expo-device";
import * as Battery from "expo-battery";
import { z } from "zod";
import { toolRegistry } from "./registry";

toolRegistry.register("get_device_info", {
    description:
        "Get information about the device including branch, model, OS version, and device name.",
    parameters: z.object({}),
    execute: async () => {
        return {
            branch: Device.brand,
            modelName: Device.modelName,
            osName: Device.osName,
            osVersion: Device.osVersion,
            deviceName: Device.deviceName,
            isDevice: Device.isDevice,
            deviceType: Device.deviceType,
        };
    },
});

toolRegistry.register("get_battery_status", {
    description: "Get teh current battery level and charging state of the device.",
    parameters: z.object({}),
    execute: async () => {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();

        const stateMap: Record<number, string> = {
            [Battery.BatteryState.UNKNOWN]: "unknown",
            [Battery.BatteryState.UNPLUGGED]: "unplugged",
            [Battery.BatteryState.CHARGING]: "charging",
            [Battery.BatteryState.FULL]: "full",
        };

        return {
            level: Math.round(level * 100),
            state: stateMap[state] ?? "unknown",
            isCharging: state === Battery.BatteryState.CHARGING,
            isFull: state === Battery.BatteryState.FULL,
        };
    },
});
