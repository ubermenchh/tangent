import React from "react";
import { render } from "@testing-library/react-native";
import { TaskList } from "@/components/tasks/TaskList";
import type { Task } from "@/types/task";

const mockTaskState = {
    tasks: [] as Task[],
};

jest.mock("@/stores/taskStore", () => ({
    useTaskStore: (selector: (state: typeof mockTaskState) => unknown) => selector(mockTaskState),
}));

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

jest.mock("@/components/tasks/TaskItem", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        TaskItem: ({ task }: { task: { id: string } }) =>
            React.createElement(Text, null, `task:${task.id}`),
    };
});

function makeTask(id: string, status: Task["status"], createdAt: number): Task {
    return {
        id,
        prompt: `Prompt ${id}`,
        status,
        progress: 0,
        createdAt,
        updatedAt: createdAt,
        steps: [],
    };
}

describe("TaskList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTaskState.tasks = [];
    });

    test("renders empty state when there are no tasks", () => {
        const { getByText } = render(<TaskList />);

        expect(getByText("No background tasks yet")).toBeTruthy();
        expect(getByText("Long-press the send button to run a task in the background")).toBeTruthy();
    });

    test("renders task items when tasks exist", () => {
        mockTaskState.tasks = [makeTask("a", "running", 100)];

        const { getByText, queryByText } = render(<TaskList />);

        expect(getByText("task:a")).toBeTruthy();
        expect(queryByText("No background tasks yet")).toBeNull();
    });

    test("sorts active tasks first, then by createdAt descending", () => {
        mockTaskState.tasks = [
            makeTask("a", "completed", 300),
            makeTask("b", "running", 100),
            makeTask("c", "queued", 400),
            makeTask("d", "awaiting_confirmation", 200),
            makeTask("e", "failed", 500),
        ];

        const { getAllByText } = render(<TaskList />);

        const orderedIds = getAllByText(/^task:/).map(node =>
            String(node.props.children).replace("task:", "")
        );

        expect(orderedIds).toEqual(["c", "d", "b", "e", "a"]);
    });
});