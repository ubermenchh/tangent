import * as Device from "expo-device";
import * as Battery from "expo-battery";
import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("DeviceTools");

toolRegistry.register("get_device_info", {
    description:
        "Get information about the device including brand, model, OS version, and device name.",
    parameters: z.object({}),
    execute: async () => {
        log.debug("Getting device info");
        const info = {
            brand: Device.brand,
            modelName: Device.modelName,
            osName: Device.osName,
            osVersion: Device.osVersion,
            deviceName: Device.deviceName,
            isDevice: Device.isDevice,
            deviceType: Device.deviceType,
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
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();

        const stateMap: Record<number, string> = {
            [Battery.BatteryState.UNKNOWN]: "unknown",
            [Battery.BatteryState.UNPLUGGED]: "unplugged",
            [Battery.BatteryState.CHARGING]: "charging",
            [Battery.BatteryState.FULL]: "full",
        };

        const status = {
            level: Math.round(level * 100),
            state: stateMap[state] ?? "unknown",
            isCharging: state === Battery.BatteryState.CHARGING,
            isFull: state === Battery.BatteryState.FULL,
        };
        log.info(`Battery: ${status.level}% (${status.state})`);
        return status;
    },
});
