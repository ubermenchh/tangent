import { PermissionsAndroid, Platform } from "react-native";
import { MobileSms } from "react-native-mobile-sms";
import { z } from "zod";
import { toolRegistry } from "./registry";

async function requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== "android") {
        return false;
    }

    try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
            title: "SMS Permission",
            message: "Tangent needs permission to send messages directly.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
        console.error("SMS permission error:", error);
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
        const hasPermission = await requestSmsPermission();
        if (!hasPermission) {
            return { success: false, error: "SMS permission not granted" };
        }

        try {
            MobileSms.sendSms(phoneNumber, message);

            return {
                success: true,
                phoneNumber,
                messageSent: message,
                status: "sent (fire-and-forget)",
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to send SMS ${error}`,
            };
        }
    },
});