import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TasksScreen from "../../app/tasks";

const mockBack = jest.fn();
const mockClearCompletedTasks = jest.fn();

const mockTaskStoreState = {
    clearCompletedTasks: mockClearCompletedTasks,
    tasks: [] as Array<{ status: string }>,
};

jest.mock("expo-router", () => ({
    router: {
        back: (...args: unknown[]) => mockBack(...args),
    },
}));

jest.mock("@/stores/taskStore", () => ({
    useTaskStore: (selector: (state: typeof mockTaskStoreState) => unknown) =>
        selector(mockTaskStoreState),
}));

jest.mock("@/components/tasks", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        TaskList: () => React.createElement(Text, null, "TaskListMock"),
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

describe("app/tasks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTaskStoreState.tasks = [];
    });

    test("renders header and task list", () => {
        const { getByText } = render(<TasksScreen />);

        expect(getByText("Background Tasks")).toBeTruthy();
        expect(getByText("TaskListMock")).toBeTruthy();
    });

    test("pressing back triggers router.back", () => {
        const { UNSAFE_getByProps } = render(<TasksScreen />);

        // Back button Pressable has a unique hitSlop in this screen
        const backButton = UNSAFE_getByProps({ hitSlop: 8 });
        fireEvent.press(backButton);

        expect(mockBack).toHaveBeenCalledTimes(1);
    });

    test("does not show clear action when no completed tasks", () => {
        mockTaskStoreState.tasks = [{ status: "running" }];

        const { queryByText } = render(<TasksScreen />);

        expect(queryByText("Clear")).toBeNull();
    });

    test("shows clear action and clears completed tasks", () => {
        mockTaskStoreState.tasks = [{ status: "completed" }];

        const { getByText } = render(<TasksScreen />);

        const clearButtonText = getByText("Clear");
        expect(clearButtonText).toBeTruthy();

        fireEvent.press(clearButtonText);

        expect(mockClearCompletedTasks).toHaveBeenCalledTimes(1);
    });
});
