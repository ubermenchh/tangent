import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TaskItem } from "@/components/tasks/TaskItem";
import type { Task, TaskStatus } from "@/types/task";

jest.mock("react-native-reanimated", () => {
    const { View, Text } = require("react-native");
    const chain = {
        springify: () => chain,
    };

    return {
        __esModule: true,
        default: { View, Text },
        View,
        Text,
        FadeInDown: {
            duration: () => chain,
        },
        createAnimatedComponent: (Component: unknown) => Component,
    };
});

jest.mock("@/components/ui/text", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        Text: (props: Record<string, unknown> & { children?: unknown }) =>
            React.createElement(Text, props, props.children),
    };
});

jest.mock("lucide-react-native", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Icon = () => React.createElement(View);
    return new Proxy({}, { get: () => Icon });
});

const mockCancelTask = jest.fn();
const mockConfirmAction = jest.fn();
const mockStop = jest.fn();

jest.mock("@/stores/taskStore", () => ({
    useTaskStore: () => ({
        cancelTask: (...args: unknown[]) => mockCancelTask(...args),
        confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
    }),
}));

jest.mock("@/services/backgroundTaskService", () => ({
    backgroundTaskService: {
        stop: (...args: unknown[]) => mockStop(...args),
    },
}));

function makeTask(overrides: Partial<Task> = {}): Task {
    const now = 1700000000000;
    return {
        id: "task-1",
        prompt: "Do something",
        status: "queued",
        progress: 0,
        createdAt: now,
        updatedAt: now,
        steps: [],
        ...overrides,
    };
}

describe("TaskItem", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test.each([
        ["queued", "Queued"],
        ["running", "Running"],
        ["awaiting_confirmation", "Awaiting Approval"],
        ["completed", "Completed"],
        ["failed", "Failed"],
        ["cancelled", "Cancelled"],
    ] as Array<[TaskStatus, string]>)("shows correct label for %s", (status, label) => {
        const { getByText } = render(<TaskItem task={makeTask({ status })} />);
        expect(getByText(label)).toBeTruthy();
    });

    test("shows cancel button for active task and cancels correctly", () => {
        const { UNSAFE_getByProps } = render(<TaskItem task={makeTask({ status: "running" })} />);
        const cancelButton = UNSAFE_getByProps({ hitSlop: 8 });

        fireEvent.press(cancelButton);

        expect(mockCancelTask).toHaveBeenCalledWith("task-1");
        expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test("does not show cancel button for inactive task", () => {
        const { UNSAFE_queryByProps } = render(
            <TaskItem task={makeTask({ status: "completed" })} />
        );
        expect(UNSAFE_queryByProps({ hitSlop: 8 })).toBeNull();
    });

    test("renders running progress and current step", () => {
        const { getByText, UNSAFE_getAllByType } = render(
            <TaskItem
                task={makeTask({ status: "running", progress: 42, currentStep: "Embedding files" })}
            />
        );

        expect(getByText("Embedding files")).toBeTruthy();

        const { View } = require("react-native");
        const progressFill = UNSAFE_getAllByType(View).find(node => {
            const style = Array.isArray(node.props.style)
                ? Object.assign({}, ...node.props.style)
                : node.props.style;
            return style?.width === "42%";
        });

        expect(progressFill).toBeTruthy();
    });

    test("renders confirmation UI and handles approve/deny", () => {
        const task = makeTask({
            status: "awaiting_confirmation",
            pendingConfirmation: {
                action: "send_sms",
                description: "Send SMS to John?",
                toolCall: { name: "send_sms", arguments: { to: "John" } },
            },
        });

        const { getByText } = render(<TaskItem task={task} />);

        expect(getByText("Send SMS to John?")).toBeTruthy();

        fireEvent.press(getByText("Approve"));
        fireEvent.press(getByText("Deny"));

        expect(mockConfirmAction).toHaveBeenNthCalledWith(1, "task-1", true);
        expect(mockConfirmAction).toHaveBeenNthCalledWith(2, "task-1", false);
    });

    test("renders failed error message", () => {
        const { getByText } = render(
            <TaskItem task={makeTask({ status: "failed", error: "Something failed" })} />
        );
        expect(getByText("Something failed")).toBeTruthy();
    });

    test("renders completed result message", () => {
        const { getByText } = render(
            <TaskItem task={makeTask({ status: "completed", result: "Done successfully" })} />
        );
        expect(getByText("Done successfully")).toBeTruthy();
    });

    test("renders timestamp from createdAt", () => {
        const toLocaleSpy = jest
            .spyOn(Date.prototype, "toLocaleString")
            .mockReturnValue("Mock Timestamp");

        const { getByText } = render(<TaskItem task={makeTask()} />);
        expect(getByText("Mock Timestamp")).toBeTruthy();

        toLocaleSpy.mockRestore();
    });
});
