jest.mock("expo-web-browser", () => ({
    maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("expo-auth-session", () => {
    const mockPromptAsync = jest.fn();
    const mockAuthRequest = jest.fn().mockImplementation(() => ({
        codeVerifier: "verifier-123",
        promptAsync: mockPromptAsync,
    }));

    return {
        makeRedirectUri: jest.fn(() => "tangent://youtube-callback"),
        AuthRequest: mockAuthRequest,
        exchangeCodeAsync: jest.fn(),
        __mockPromptAsync: mockPromptAsync,
        __mockAuthRequest: mockAuthRequest,
    };
});

type YoutubeAuthModule = typeof import("@/integrations/youtubeAuth");

type AuthSessionMock = {
    makeRedirectUri: jest.Mock;
    AuthRequest: jest.Mock;
    exchangeCodeAsync: jest.Mock;
    __mockPromptAsync: jest.Mock;
    __mockAuthRequest: jest.Mock;
};

type WebBrowserMock = {
    maybeCompleteAuthSession: jest.Mock;
};

function loadYoutubeAuthModule(clientId?: string): {
    youtubeAuth: YoutubeAuthModule;
    authSessionMock: AuthSessionMock;
    webBrowserMock: WebBrowserMock;
} {
    jest.resetModules();

    if (clientId === undefined) {
        delete process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID;
    } else {
        process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID = clientId;
    }

    const authSessionMock = jest.requireMock("expo-auth-session") as AuthSessionMock;
    const webBrowserMock = jest.requireMock("expo-web-browser") as WebBrowserMock;

    const youtubeAuth = jest.requireActual("@/integrations/youtubeAuth") as YoutubeAuthModule;

    return { youtubeAuth, authSessionMock, webBrowserMock };
}

describe("youtubeAuth integration", () => {
    const originalClientId = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        fetchMock = jest.fn();
        (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    });

    afterEach(() => {
        jest.restoreAllMocks();

        if (originalClientId === undefined) {
            delete process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID;
        } else {
            process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID = originalClientId;
        }
    });

    test("runs auth-session setup side effects on import", () => {
        const { authSessionMock, webBrowserMock } = loadYoutubeAuthModule("client-1");

        expect(webBrowserMock.maybeCompleteAuthSession).toHaveBeenCalledTimes(1);
        expect(authSessionMock.makeRedirectUri).toHaveBeenCalledWith({
            scheme: "tangent",
            path: "youtube-callback",
        });
    });

    test("getStoredToken returns null when nothing is stored", () => {
        const { youtubeAuth } = loadYoutubeAuthModule("client-1");

        expect(youtubeAuth.getStoredToken()).toBeNull();
        expect(youtubeAuth.isAuthenticated()).toBe(false);
    });

    test("authenticate throws when client id is missing", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule();

        await expect(youtubeAuth.authenticate()).rejects.toThrow(
            "YouTube OAuth Client ID not configured"
        );

        expect(authSessionMock.__mockPromptAsync).not.toHaveBeenCalled();
        expect(authSessionMock.exchangeCodeAsync).not.toHaveBeenCalled();
    });

    test("authenticate succeeds and uses expected OAuth params", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-abc");

        jest.spyOn(Date, "now").mockReturnValue(1000);

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "auth-code-1" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "token-1",
            refreshToken: "refresh-1",
            expiresIn: 120,
        });

        const token = await youtubeAuth.authenticate();

        expect(token).toBe("token-1");

        expect(authSessionMock.__mockAuthRequest).toHaveBeenCalledWith({
            clientId: "client-abc",
            scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
            redirectUri: "tangent://youtube-callback",
            usePKCE: true,
        });

        expect(authSessionMock.__mockPromptAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
                tokenEndpoint: "https://oauth2.googleapis.com/token",
                revocationEndpoint: "https://oauth2.googleapis.com/revoke",
            })
        );

        expect(authSessionMock.exchangeCodeAsync).toHaveBeenCalledWith(
            {
                clientId: "client-abc",
                code: "auth-code-1",
                redirectUri: "tangent://youtube-callback",
                extraParams: { code_verifier: "verifier-123" },
            },
            expect.objectContaining({
                tokenEndpoint: "https://oauth2.googleapis.com/token",
            })
        );
    });

    test("getStoredToken returns token before expiry and null at expiry", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        jest.spyOn(Date, "now")
            .mockReturnValueOnce(1000) // token storage timestamp
            .mockReturnValueOnce(2500) // still valid
            .mockReturnValueOnce(3000); // at expiry boundary -> invalid (strict <)

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "code-2" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "expiring-token",
            refreshToken: "refresh-2",
            expiresIn: 2,
        });

        await youtubeAuth.authenticate();

        expect(youtubeAuth.getStoredToken()).toBe("expiring-token");
        expect(youtubeAuth.getStoredToken()).toBeNull();
    });

    test("authenticate reuses cached token and skips OAuth round-trip", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        jest.spyOn(Date, "now").mockReturnValue(1000);

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "code-3" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "cached-token",
            refreshToken: "refresh-3",
            expiresIn: 3600,
        });

        await youtubeAuth.authenticate();

        jest.spyOn(Date, "now").mockReturnValue(2000);
        const token = await youtubeAuth.authenticate();

        expect(token).toBe("cached-token");
        expect(authSessionMock.__mockPromptAsync).toHaveBeenCalledTimes(1);
        expect(authSessionMock.exchangeCodeAsync).toHaveBeenCalledTimes(1);
    });

    test("authenticate uses default expiry when expiresIn is missing", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        jest.spyOn(Date, "now")
            .mockReturnValueOnce(5000) // storage timestamp
            .mockReturnValueOnce(3_604_000); // still before default expiry (3_605_000)

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "code-4" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "default-expiry-token",
        });

        await youtubeAuth.authenticate();

        expect(youtubeAuth.getStoredToken()).toBe("default-expiry-token");
    });

    test("authenticate throws when OAuth is dismissed", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "dismiss",
            params: {},
        });

        await expect(youtubeAuth.authenticate()).rejects.toThrow(
            "YouTube authentication cancelled or failed"
        );
        expect(authSessionMock.exchangeCodeAsync).not.toHaveBeenCalled();
    });

    test("authenticate throws when OAuth success has no code", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: {},
        });

        await expect(youtubeAuth.authenticate()).rejects.toThrow(
            "YouTube authentication cancelled or failed"
        );
        expect(authSessionMock.exchangeCodeAsync).not.toHaveBeenCalled();
    });

    test("logout clears stored auth state", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        jest.spyOn(Date, "now").mockReturnValue(1000);

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "code-5" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "logout-me",
            refreshToken: "refresh-5",
            expiresIn: 3600,
        });

        await youtubeAuth.authenticate();
        expect(youtubeAuth.isAuthenticated()).toBe(true);

        youtubeAuth.logout();

        expect(youtubeAuth.getStoredToken()).toBeNull();
        expect(youtubeAuth.isAuthenticated()).toBe(false);
    });

    test("youtubeApiCall sends bearer token and returns json payload", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        jest.spyOn(Date, "now").mockReturnValue(1000);

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "code-6" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "api-token",
            refreshToken: "refresh-6",
            expiresIn: 3600,
        });

        await youtubeAuth.authenticate();

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ items: [{ id: "vid-1" }] }),
        });

        const result = await youtubeAuth.youtubeApiCall("/videos?part=snippet");

        expect(fetchMock).toHaveBeenCalledWith(
            "https://www.googleapis.com/youtube/v3/videos?part=snippet",
            {
                headers: { Authorization: "Bearer api-token" },
            }
        );
        expect(result).toEqual({ items: [{ id: "vid-1" }] });
    });

    test("youtubeApiCall throws formatted status when API responds non-ok", async () => {
        const { youtubeAuth, authSessionMock } = loadYoutubeAuthModule("client-1");

        jest.spyOn(Date, "now").mockReturnValue(1000);

        authSessionMock.__mockPromptAsync.mockResolvedValueOnce({
            type: "success",
            params: { code: "code-7" },
        });

        authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
            accessToken: "api-token-2",
            refreshToken: "refresh-7",
            expiresIn: 3600,
        });

        await youtubeAuth.authenticate();

        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 403,
        });

        await expect(youtubeAuth.youtubeApiCall("/playlists?mine=true")).rejects.toThrow(
            "YouTube API error: 403"
        );
    });
});