import { skillRegistry } from "./registry";
import {
    socialMediaSkill,
    shoppingSkill,
    productivitySkill,
    navigationSkill,
    entertainmentSkill,
} from "./builtins";
import { logger } from "@/lib/logger";

const log = logger.create("Skills");

let initialized = false;

export function initializeSkills(): void {
    if (initialized) return;

    skillRegistry.register(socialMediaSkill, [
        "twitter",
        "x",
        "tweet",
        "instagram",
        "ig",
        "insta",
        "whatsapp",
        "telegram",
        "social media",
        "post",
        "dm",
        "direct message",
        "story",
        "stories",
        "feed",
        "timeline",
        "retweet",
        "like",
        "follow",
        "unfollow",
        "snapchat",
        "facebook",
        "tiktok",
    ]);

    skillRegistry.register(shoppingSkill, [
        "amazon",
        "flipkart",
        "myntra",
        "swiggy",
        "zomato",
        "order",
        "buy",
        "purchase",
        "shop",
        "cart",
        "delivery",
        "food",
        "restaurant",
        "price",
        "product",
        "deal",
    ]);

    skillRegistry.register(productivitySkill, [
        "reminder",
        "remind",
        "calendar",
        "event",
        "meeting",
        "schedule",
        "email",
        "gmail",
        "note",
        "notes",
        "keep",
        "todo",
        "task",
        "deadline",
    ]);

    skillRegistry.register(navigationSkill, [
        "navigate",
        "directions",
        "map",
        "maps",
        "route",
        "uber",
        "ola",
        "cab",
        "taxi",
        "drive",
        "walk",
        "transit",
        "bus",
        "train",
        "commute",
        "traffic",
    ]);

    skillRegistry.register(entertainmentSkill, [
        "play",
        "music",
        "song",
        "video",
        "youtube",
        "spotify",
        "netflix",
        "watch",
        "listen",
        "stream",
        "movie",
        "show",
        "podcast",
        "album",
        "playlist",
    ]);

    initialized = true;
    log.info(`Skills initialized: ${skillRegistry.getAllSkills().length} skills registered`);
}

export { skillRegistry } from "./registry";
export type { Skill, SkillMatch, ScopedAgentConfig } from "./types";
