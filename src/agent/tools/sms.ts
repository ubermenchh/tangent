import { PermissionsAndroid, Platform } from "react-native";
import { SendDirectSms } from "react-native-send-direct-sms";
import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("SMSTools");

async function requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== "android") {
        log.warn("SMS not supported on this platform");
        return false;
    }

    try {
        log.debug("Requesting SMS permission");
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
            title: "SMS Permission",
            message: "Tangent needs permission to send messages directly.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
        });
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        log.info(`SMS permission: ${hasPermission ? "granted" : "denied"}`);
        return hasPermission;
    } catch (error) {
        log.error("SMS permission error", error);
        return false;
    }
}

toolRegistry.register("send_sms", {
    description: "Send an SMS text message directly to a phone number without opening the SMS app.",
    parameters: z.object({
        phoneNumber: z.string().describe("The phone number to send the SMS to."),
        message: z.string().describe("The text message content to send."),
    }),
    execute: async ({ phoneNumber, message }) => {
        log.info(`Sending SMS to ${phoneNumber}: "${message.slice(0, 30)}..."`);

        const hasPermission = await requestSmsPermission();
        if (!hasPermission) {
            log.warn("SMS send blocked - no permission");
            return { success: false, error: "SMS permission not granted" };
        }

        try {
            const result = await SendDirectSms(phoneNumber, message);
            log.info(`SMS sent successfully to ${phoneNumber}`, result);

            return {
                success: true,
                phoneNumber,
                messageSent: message,
                result,
            };
        } catch (error) {
            log.error(`Failed to send SMS to ${phoneNumber}`, error);
            return {
                success: false,
                error: `Failed to send SMS ${error}`,
            };
        }
    },
});
