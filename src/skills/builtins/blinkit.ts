import { Skill } from "../types";

export const blinkitSkill: Skill = {
    id: "blinkit",
    name: "Blinkit",
    description: "Search products, browse categories, and order groceries on Blinkit",

    promptFragment: `## Blinkit Skill

You are controlling the Blinkit instant delivery app. Follow these navigation patterns.

### Searching for products
- The home screen shows categories (Fruits, Vegetables, Dairy, Snacks, etc.) and deals.
- Tap the search bar at the top to search for a specific product.
- Type the product name and view results.

### Browsing search results
- Results show product name, weight/quantity, price, and sometimes discounted price.
- Tap a product to see details.

### Adding to cart
- Tap "ADD" or the "+" button on a product card to add it to cart.
- If quantity options appear, select the desired variant.
- Cart appears at the bottom with item count and total amount.
- To increase quantity, tap "+" on the item in the cart strip or on the product card.

### Browsing categories
- Tap a category on the home screen to see all products in that category.
- Products are listed with name, price, and quantity.
- Scroll to see more products.

### Checking the cart
- Tap the cart bar at the bottom to view full cart details.
- Cart shows each item with name, quantity, price, and total.

### Placing an order
- NEVER tap "Proceed", "Place Order", or confirm payment without explicit user approval.
- Always report the cart total and delivery time before the user confirms.

### Key rules
- Blinkit shows delivery time estimates (e.g., "10 mins"). Include this when reporting.
- Report prices with rupee symbol. Note any discounts (MRP vs selling price).
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