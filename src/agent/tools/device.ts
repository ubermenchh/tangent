import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("DeviceTools");

let Device: typeof import("expo-device") | null = null;
let Battery: typeof import("expo-battery") | null = null;

async function getDevice() {
    if (!Device) {
        Device = await import("expo-device");
    }
    return Device;
}

async function getBattery() {
    if (!Battery) {
        Battery = await import("expo-battery");
    }
    return Battery;
}

toolRegistry.register("get_device_info", {
    description:
        "Get information about the device including brand, model, OS version, and device name.",
    parameters: z.object({}),
    execute: async () => {
        log.debug("Getting device info");
        const DeviceModule = await getDevice();
        const info = {
            brand: DeviceModule.brand,
            modelName: DeviceModule.modelName,
            osName: DeviceModule.osName,
            osVersion: DeviceModule.osVersion,
            deviceName: DeviceModule.deviceName,
            isDevice: DeviceModule.isDevice,
            deviceType: DeviceModule.deviceType,
        };
        log.info(`Device: ${info.brand} ${info.modelName} (${info.osName} ${info.osVersion})`);
        return info;
    },
});

toolRegistry.register("get_battery_status", {
    description: "Get the current battery level and charging state of the device.",
    parameters: z.object({}),
    execute: async () => {
        log.debug("Getting battery status");
        const BatteryModule = await getBattery();
        const level = await BatteryModule.getBatteryLevelAsync();
        const state = await BatteryModule.getBatteryStateAsync();

        const stateMap: Record<number, string> = {
            [BatteryModule.BatteryState.UNKNOWN]: "unknown",
            [BatteryModule.BatteryState.UNPLUGGED]: "unplugged",
            [BatteryModule.BatteryState.CHARGING]: "charging",
            [BatteryModule.BatteryState.FULL]: "full",
        };

        const status = {
            level: Math.round(level * 100),
            state: stateMap[state] ?? "unknown",
            isCharging: state === BatteryModule.BatteryState.CHARGING,
            isFull: state === BatteryModule.BatteryState.FULL,
        };
        log.info(`Battery: ${status.level}% (${status.state})`);
        return status;
    },
});
