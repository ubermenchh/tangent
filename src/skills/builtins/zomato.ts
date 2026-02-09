import { Skill } from "../types";

export const zomatoSkill: Skill = {
    id: "zomato",
    name: "Zomato",
    description: "Search restaurants, browse menus, and order food on Zomato",

    promptFragment: `## Zomato Skill

You are controlling the Zomato food delivery app. Follow these navigation patterns.

### Searching for food or restaurants
- The home screen shows categories, featured restaurants, and promotions.
- Tap the search bar at the top to search.
- Type a restaurant name, cuisine, or dish name.
- Call get_screen to see search results.

### Browsing restaurants
- Search results show restaurant name, cuisine type, rating, delivery time, and cost for two.
- Tap a restaurant to view its menu.
- When reporting restaurants, include: name, rating, delivery time, cost estimate.

### Browsing a restaurant menu
- Menu is organized by categories (Recommended, Starters, Main Course, etc.).
- Each item shows: name, price, description, and sometimes a veg/non-veg indicator.
- Scroll to see more menu items.

### Adding items to cart
- Tap "ADD" button next to a menu item to add it to cart.
- If the item has variants (size, customizations), a popup appears -- select the option and tap "Add item".
- Cart summary appears at the bottom showing item count and total.

### Placing an order
- NEVER tap "Proceed to checkout", "Place Order", or confirm payment without explicit user approval.
- Always report the cart total and items before the user confirms.

### Key rules
- Report ratings as X.X/5 format.
- Include delivery time estimates when browsing restaurants.
- Always mention prices with the rupee symbol.
- Do NOT call return_to_tangent or go_home in background tasks.`,

    requiredGlobalTools: [
        "check_accessibility",
        "open_accessibility_settings",
        "get_screen",
        "tap",
        "tap_at",
        "type_text",
        "scroll",
        "press_back",
        "wait",
        "open_app",
    ],

    maxSteps: 20,
    needsAccessibility: true,
    needsBackground: true,
};