import { Skill } from "../types";

export const amazonSkill: Skill = {
    id: "amazon",
    name: "Amazon",
    description: "Search products, check prices, read reviews, and manage cart on Amazon",

    promptFragment: `## Amazon Skill

You are controlling the Amazon Shopping app. Follow these navigation patterns.

### Searching for products
- The search bar is at the top of the home screen. Tap it to focus.
- Use type_text to enter the search query.
- Tap the search/magnifying glass button or press enter to search.
- Call get_screen to see search results.

### Browsing search results
- Results show product title, price, rating (stars), number of reviews, and Prime eligibility.
- Scroll down to see more results.
- When reporting results, include: product name, price, rating, and review count.

### Viewing a product
- Tap the product title or image to open the product detail page.
- Detail page shows: full title, price, availability, description, and reviews.
- Scroll down to see more details and customer reviews.

### Adding to cart
- On the product detail page, tap "Add to Cart" button.
- NEVER tap "Buy Now" or complete a purchase without explicit user confirmation.
- After adding to cart, confirm: "Added [product name] at [price] to your cart."

### Checking the cart
- Tap the cart icon (usually top right, shows item count).
- Cart page lists all items with prices and quantities.

### Key rules
- Amazon has dense product listings. Prioritize extracting: name, price, rating.
- Always report prices with currency symbol.
- NEVER complete a purchase or place an order. Only add to cart if asked.
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
        "web_search",
    ],

    maxSteps: 20,
    needsAccessibility: true,
    needsBackground: true,
};
