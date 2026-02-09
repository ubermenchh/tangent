import { Skill } from "../types";

export const shoppingSkill: Skill = {
    id: "shopping",
    name: "Shopping",
    description: "Browse and search on shopping apps like Amazon, Flipkart, Swiggy, Zomato",

    promptFragment: `## Shopping Skill

You are helping the user shop or order food/items through apps.

### Amazon / Flipkart
- Search: tap search bar at top -> type_text query -> tap search/enter
- Results: scroll through product listings. Each shows title, price, rating.
- To view a product: tap its title or image
- To add to cart: tap "Add to Cart" button on the product page
- NEVER complete a purchase without explicit user confirmation

### Swiggy / Zomato
- Home screen shows restaurants and categories
- Search: tap search bar -> type restaurant or food name
- To order: tap restaurant -> browse menu -> tap "ADD" on items
- NEVER place an order without explicit user confirmation

Always report prices and ratings when browsing products.
When adding items to cart, confirm the item name and price with the user before proceeding.`,

    requiredGlobalTools: [
        "check_accessibility",
        "open_accessibility_settings",
        "get_screen",
        "tap",
        "tap_at",
        "type_text",
        "scroll",
        "press_back",
        "go_home",
        "wait",
        "open_app",
        "return_to_tangent",
        "web_search",
    ],

    maxSteps: 20,
    needsAccessibility: true,
    needsBackground: true,
};
