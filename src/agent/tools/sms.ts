import { PermissionsAndroid, Platform } from "react-native";
import mobileSms from "react-native-mobile-sms";
import { toolRegistry } from "./registry";

async function requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== "android") {
        return false;
    }

    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            {
                title: "SMS Permission",
                message: "Tangent needs permission to send messages directly.",
                buttonPositive: "Allow",
                buttonNegative: "Deny",
            }
        )
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
        console.error("SMS permission error:", error);
        return false;
    }
}

toolRegistry.register(
    {
        name: "send_sms",
        description: "Send an SMS text message directly to a phone number without opening the SMS app.",
        parameters: {
            type: "object",
            properties: {
                phoneNumber: {
                    type: "string",
                    description: "The phone number to send the SMS to.",
                },
                message: {
                    type: "string",
                    description: "The text message content to send."
                },
            },
            required: ["phoneNumber", "message"],
        },
    },
    async (args) => {
        const { phoneNumber, message } = args as { phoneNumber: string; message: string; }
        const hasPermission = await requestSmsPermission();
        if (!hasPermission) {
            return { success: false, error: "SMS permission not granted" }
        }

        try {
            const response = await mobileSms.sendDirectSms(phoneNumber, message);

            return {
                success: true,
                phoneNumber,
                messageSent: message,
                response,
            }
        } catch (error) {
            return {
                success: false,
                error: `Failed to send SMS ${error}`,
            }
        }
    }
)