let suppressEscalation = false;
let suppressTimer: ReturnType<typeof setTimeout> | null = null;

export function suppressBackgroundEscalation(durationMs: number = 30000) {
    suppressEscalation = true;
    if (suppressTimer) clearTimeout(suppressTimer);
    suppressTimer = setTimeout(() => {
        suppressEscalation = false;
        suppressTimer = null;
    }, durationMs);
}

export function clearEscalationSuppression() {
    suppressEscalation = false;
    if (suppressTimer) {
        clearTimeout(suppressTimer);
        suppressTimer = null;
    }
}

export function isEscalationSuppressed(): boolean {
    return suppressEscalation;
}
