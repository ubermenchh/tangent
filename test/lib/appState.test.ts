import {
    clearEscalationSuppression,
    isEscalationSuppressed,
    suppressBackgroundEscalation,
} from "@/lib/appState";

describe("appState escalation suppression", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        clearEscalationSuppression();
    });

    afterEach(() => {
        clearEscalationSuppression();
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test("is not suppressed by default", () => {
        expect(isEscalationSuppressed()).toBe(false);
    });

    test("suppresses immediately and auto-clears after custom duration", () => {
        suppressBackgroundEscalation(1000);

        expect(isEscalationSuppressed()).toBe(true);

        jest.advanceTimersByTime(999);
        expect(isEscalationSuppressed()).toBe(true);

        jest.advanceTimersByTime(1);
        expect(isEscalationSuppressed()).toBe(false);
    });

    test("uses default duration when not provided", () => {
        suppressBackgroundEscalation();

        expect(isEscalationSuppressed()).toBe(true);

        jest.advanceTimersByTime(29999);
        expect(isEscalationSuppressed()).toBe(true);

        jest.advanceTimersByTime(1);
        expect(isEscalationSuppressed()).toBe(false);
    });

    test("restarting suppression resets the timer", () => {
        suppressBackgroundEscalation(1000);

        jest.advanceTimersByTime(900);
        suppressBackgroundEscalation(1000);

        // Original timer would have expired at t=1000, but reset should keep suppression true.
        jest.advanceTimersByTime(200);
        expect(isEscalationSuppressed()).toBe(true);

        jest.advanceTimersByTime(800);
        expect(isEscalationSuppressed()).toBe(false);
    });

    test("clearEscalationSuppression clears state immediately and cancels timer", () => {
        suppressBackgroundEscalation(1000);
        expect(isEscalationSuppressed()).toBe(true);

        clearEscalationSuppression();
        expect(isEscalationSuppressed()).toBe(false);

        jest.advanceTimersByTime(5000);
        expect(isEscalationSuppressed()).toBe(false);
    });
});