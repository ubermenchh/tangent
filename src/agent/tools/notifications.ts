import * as Notifications from "expo-notifications";
import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("NotificationTools");

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
}

toolRegistry.register("schedule_reminder", {
    description: "Schedule a reminder notification for a specific time",
    parameters: z.object({
        title: z.string().describe("The reminder title"),
        body: z.string().describe("The reminder message"),
        delayMinutes: z.number().describe("Minutes from now to show the reminder"),
    }),
    execute: async ({ title, body, delayMinutes }) => {
        log.info(`Scheduling reminder: "${title}" in ${delayMinutes} minutes`);

        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            return { success: false, error: "Notification permission not granted" };
        }

        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: delayMinutes * 60,
                },
            });

            log.info(`Reminder scheduled with id: ${id}`);
            return {
                success: true,
                message: `Reminder set for ${delayMinutes} minutes from now`,
                notificationId: id,
            };
        } catch (error) {
            log.error("Failed to schedule reminder", error);
            return { success: false, error: "Failed to schedule reminder" };
        }
    },
});

toolRegistry.register("cancel_reminder", {
    description: "Cancel a scheduled reminder by its ID",
    parameters: z.object({
        notificationId: z.string().describe("The notification ID to cancel"),
    }),
    execute: async ({ notificationId }) => {
        log.info(`Canceling reminder: ${notificationId}`);
        try {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
            return { success: true, message: "Reminder cancelled" };
        } catch (error) {
            log.error("Failed to cancel reminder", error);
            return { success: false, error: "Failed to cancel reminder" };
        }
    },
});

toolRegistry.register("get_scheduled_reminders", {
    description: "Get all currently scheduled reminders",
    parameters: z.object({}),
    execute: async () => {
        log.info("Getting scheduled reminders");
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            return {
                success: true,
                count: scheduled.length,
                reminders: scheduled.map(n => ({
                    id: n.identifier,
                    title: n.content.title,
                    body: n.content.body,
                })),
            };
        } catch (error) {
            log.error("Failed to get reminders", error);
            return { success: false, error: "Failed to get reminders" };
        }
    },
});
