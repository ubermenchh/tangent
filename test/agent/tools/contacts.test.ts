jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("expo-contacts", () => ({
    requestPermissionsAsync: jest.fn(),
    getContactsAsync: jest.fn(),
    Fields: {
        PhoneNumbers: "phoneNumbers",
        Name: "name",
    },
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        })),
    },
}));

import "@/agent/tools/contacts";
import { toolRegistry } from "@/agent/tools/registry";

const {
    requestPermissionsAsync: mockRequestPermissionsAsync,
    getContactsAsync: mockGetContactsAsync,
    Fields,
} = jest.requireMock("expo-contacts") as {
    requestPermissionsAsync: jest.Mock;
    getContactsAsync: jest.Mock;
    Fields: {
        PhoneNumbers: string;
        Name: string;
    };
};

function getExecutor(
    tools: Record<string, { execute?: unknown }>,
    name: string
): (args: Record<string, unknown>) => Promise<unknown> {
    const execute = tools[name]?.execute;
    if (typeof execute !== "function") {
        throw new Error(`Tool "${name}" does not expose execute()`);
    }
    return execute as (args: Record<string, unknown>) => Promise<unknown>;
}

describe("contacts tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("registers search_contacts", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        expect(tools.search_contacts).toBeDefined();
    });

    test("returns permission error when contacts permission is denied", async () => {
        mockRequestPermissionsAsync.mockResolvedValueOnce({ status: "denied" });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_contacts")({ query: "Mom" });

        expect(result).toEqual({ error: "Contacts permission not granted" });
        expect(mockGetContactsAsync).not.toHaveBeenCalled();
    });

    test("returns empty result message when no contacts match", async () => {
        mockRequestPermissionsAsync.mockResolvedValueOnce({ status: "granted" });
        mockGetContactsAsync.mockResolvedValueOnce({ data: [] });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_contacts")({ query: "Unknown Person" });

        expect(mockGetContactsAsync).toHaveBeenCalledWith({
            fields: [Fields.PhoneNumbers, Fields.Name],
            name: "Unknown Person",
        });

        expect(result).toEqual({
            found: 0,
            contacts: [],
            message: 'No contacts found matching "Unknown Person"',
        });
    });

    test("returns mapped contacts with fallback fields and caps at 5 results", async () => {
        mockRequestPermissionsAsync.mockResolvedValueOnce({ status: "granted" });

        const data = [
            {
                id: "1",
                name: "Alice",
                phoneNumbers: [{ number: "+111", label: "home" }],
            },
            {
                id: "2",
                name: null,
                phoneNumbers: [{ number: "+222" }],
            },
            {
                id: "3",
                name: "Charlie",
                phoneNumbers: [],
            },
            {
                id: "4",
                name: "David",
                phoneNumbers: [{ number: "+444", label: "work" }],
            },
            {
                id: "5",
                name: "Eve",
                phoneNumbers: [{ number: "+555", label: "mobile" }],
            },
            {
                id: "6",
                name: "Frank",
                phoneNumbers: [{ number: "+666", label: "other" }],
            },
        ];

        mockGetContactsAsync.mockResolvedValueOnce({ data });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = (await getExecutor(tools, "search_contacts")({
            query: "a",
        })) as {
            found: number;
            contacts: Array<{
                id: string;
                name: string;
                phoneNumbers: Array<{ number: string; label: string }>;
            }>;
            message: string;
        };

        expect(result.found).toBe(6);
        expect(result.contacts).toHaveLength(5); // capped
        expect(result.message).toBe('Found 6 contact(s) matching "a"');

        expect(result.contacts[0]).toEqual({
            id: "1",
            name: "Alice",
            phoneNumbers: [{ number: "+111", label: "home" }],
        });

        expect(result.contacts[1]).toEqual({
            id: "2",
            name: "Unknown",
            phoneNumbers: [{ number: "+222", label: "mobile" }],
        });

        expect(result.contacts[2]).toEqual({
            id: "3",
            name: "Charlie",
            phoneNumbers: [],
        });
    });

    test("can run search twice without reinitialization issues", async () => {
        mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });
        mockGetContactsAsync.mockResolvedValue({ data: [] });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const exec = getExecutor(tools, "search_contacts");

        await exec({ query: "first" });
        await exec({ query: "second" });

        expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(2);
        expect(mockGetContactsAsync).toHaveBeenCalledTimes(2);
    });
});