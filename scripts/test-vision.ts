import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import * as fs from "fs";

const API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";

async function testVision() {
    const testImagePath = process.argv[2];

    if (!testImagePath) {
        console.error("Usage: bun test-vision.ts <path-to-image>");
        console.error("Example: bun test-vision.ts ./test-image.jpg");
        process.exit(1);
    }

    if (!fs.existsSync(testImagePath)) {
        console.error(`File not found: ${testImagePath}`);
        process.exit(1);
    }

    console.log(`Testing Gemini Vision with: ${testImagePath}`);
    console.log(`File size: ${(fs.statSync(testImagePath).size / 1024 / 1024).toFixed(2)} MB`);

    try {
        const imageBuffer = fs.readFileSync(testImagePath);
        const imageBytes = new Uint8Array(imageBuffer);

        console.log("\n--- Testing with Uint8Array ---");

        const provider = createGoogleGenerativeAI({ apiKey: API_KEY });
        const model = provider("gemini-2.0-flash");

        const { text } = await generateText({
            model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "image", image: imageBytes },
                        {
                            type: "text",
                            text: "Describe this image in 1-2 sentences for search indexing. Focus on: subjects, objects, scene, activities, colors, and any visible text.",
                        },
                    ],
                },
            ],
        });

        console.log("\nSUCCESS! Description:");
        console.log(text);
    } catch (error) {
        console.error("\nFAILED:");
        console.error(error);
    }
}

testVision();
