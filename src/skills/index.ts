import { skillRegistry } from "./registry";
import {
    whatsappSkill,
    twitterSkill,
    instagramSkill,
    facebookSkill,
    amazonSkill,
    zomatoSkill,
    blinkitSkill,
    productivitySkill,
    navigationSkill,
    entertainmentSkill,
} from "./builtins";
import { logger } from "@/lib/logger";

const log = logger.create("Skills");

let initialized = false;

export function initializeSkills(): void {
    if (initialized) return;

    skillRegistry.register(whatsappSkill, [
        "whatsapp",
        "whats app",
        "message",
        "chat",
        "dm",
        "direct message",
        "send message",
        "read message",
        "check message",
    ]);

    skillRegistry.register(twitterSkill, [
        "twitter",
        "x",
        "tweet",
        "tweets",
        "timeline",
        "feed",
        "retweet",
        "like",
        "post",
        "thread",
    ]);

    skillRegistry.register(instagramSkill, [
        "instagram",
        "ig",
        "insta",
        "story",
        "stories",
        "reel",
        "reels",
        "follow",
        "unfollow",
    ]);

    skillRegistry.register(facebookSkill, ["facebook", "fb", "news feed"]);

    skillRegistry.register(amazonSkill, [
        "amazon",
        "prime",
        "buy",
        "purchase",
        "shop",
        "shopping",
        "product",
        "price",
        "cart",
        "add to cart",
        "review",
        "reviews",
        "deal",
        "deals",
    ]);

    skillRegistry.register(zomatoSkill, [
        "zomato",
        "food",
        "restaurant",
        "order food",
        "delivery",
        "menu",
        "cuisine",
        "biryani",
        "pizza",
        "burger",
    ]);

    skillRegistry.register(blinkitSkill, [
        "blinkit",
        "blink it",
        "grocery",
        "groceries",
        "instant delivery",
        "quick delivery",
        "vegetables",
        "fruits",
        "dairy",
        "snacks",
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
