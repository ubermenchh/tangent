jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("react-native", () => {
    const mockRequest = jest.fn();
    const mockPlatform = { OS: "android" };

    return {
        Platform: mockPlatform,
        PermissionsAndroid: {
            request: mockRequest,
            PERMISSIONS: {
                SEND_SMS: "android.permission.SEND_SMS",
            },
            RESULTS: {
                GRANTED: "granted",
                DENIED: "denied",
            },
        },
        __mockRequest: mockRequest,
        __mockPlatform: mockPlatform,
    };
});

jest.mock("react-native-send-direct-sms", () => ({
    SendDirectSms: jest.fn(),
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

import "@/agent/tools/sms";
import { toolRegistry } from "@/agent/tools/registry";

const {
    __mockRequest: mockPermissionRequest,
    __mockPlatform: mockPlatform,
} = jest.requireMock("react-native") as {
    __mockRequest: jest.Mock;
    __mockPlatform: { OS: string };
};

const { SendDirectSms: mockSendDirectSms } = jest.requireMock("react-native-send-direct-sms") as {
    SendDirectSms: jest.Mock;
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

describe("sms tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatform.OS = "android";
    });

    test("registers send_sms", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        expect(tools.send_sms).toBeDefined();
    });

    test("returns permission error on non-android platforms", async () => {
        mockPlatform.OS = "ios";

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_sms")({
            phoneNumber: "+1234567890",
            message: "hello",
        });

        expect(mockPermissionRequest).not.toHaveBeenCalled();
        expect(mockSendDirectSms).not.toHaveBeenCalled();
        expect(result).toEqual({
            success: false,
            error: "SMS permission not granted",
        });
    });

    test("returns permission error when Android SMS permission is denied", async () => {
        mockPermissionRequest.mockResolvedValueOnce("denied");

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_sms")({
            phoneNumber: "+1234567890",
            message: "hello",
        });

        expect(mockPermissionRequest).toHaveBeenCalledWith(
            "android.permission.SEND_SMS",
            expect.objectContaining({
                title: "SMS Permission",
                message: "Tangent needs permission to send messages directly.",
                buttonPositive: "Allow",
                buttonNegative: "Deny",
            })
        );
        expect(mockSendDirectSms).not.toHaveBeenCalled();
        expect(result).toEqual({
            success: false,
            error: "SMS permission not granted",
        });
    });

    test("returns permission error when permission request throws", async () => {
        mockPermissionRequest.mockRejectedValueOnce(new Error("permission crash"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_sms")({
            phoneNumber: "+1234567890",
            message: "hello",
        });

        expect(mockSendDirectSms).not.toHaveBeenCalled();
        expect(result).toEqual({
            success: false,
            error: "SMS permission not granted",
        });
    });

    test("sends SMS successfully when permission is granted", async () => {
        mockPermissionRequest.mockResolvedValueOnce("granted");
        mockSendDirectSms.mockResolvedValueOnce("sent-ok");

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_sms")({
            phoneNumber: "+1234567890",
            message: "hello there",
        });

        expect(mockSendDirectSms).toHaveBeenCalledWith("+1234567890", "hello there");
        expect(result).toEqual({
            success: true,
            phoneNumber: "+1234567890",
            messageSent: "hello there",
            result: "sent-ok",
        });
    });

    test("returns failure when SMS provider throws", async () => {
        mockPermissionRequest.mockResolvedValueOnce("granted");
        mockSendDirectSms.mockRejectedValueOnce(new Error("sms-failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_sms")({
            phoneNumber: "+1234567890",
            message: "hello",
        });

        expect(result).toMatchObject({
            success: false,
        });
        expect((result as { error: string }).error).toContain("Failed to send SMS");
    });
});