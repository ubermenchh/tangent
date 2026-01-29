import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { createMMKV } from "react-native-mmkv";

WebBrowser.maybeCompleteAuthSession();

const storage = createMMKV({ id: "youtube-auth" });

const CLIENT_ID = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID;
const SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"];

const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const redirectUri = AuthSession.makeRedirectUri({
    scheme: "tangent",
    path: "youtube-callback",
});

export function getStoredToken(): string | null {
    const token = storage.getString("access_token");
    const expiry = storage.getNumber("token_expiry");

    if (token && expiry && Date.now() < expiry) {
        return token;
    }
    return null;
}

export function isAuthenticated(): boolean {
    return getStoredToken() !== null;
}

export async function authenticate(): Promise<string> {
    const existingToken = getStoredToken();
    if (existingToken) return existingToken;

    if (!CLIENT_ID) {
        throw new Error("YouTube OAuth Client ID not configured");
    }

    const request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        scopes: SCOPES,
        redirectUri,
        usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === "success" && result.params.code) {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
                clientId: CLIENT_ID,
                code: result.params.code,
                redirectUri,
                extraParams: { code_verifier: request.codeVerifier! },
            },
            discovery
        );

        storage.set("access_token", tokenResponse.accessToken);
        storage.set("refresh_token", tokenResponse.refreshToken || "");
        storage.set("token_expiry", Date.now() + (tokenResponse.expiresIn || 3600) * 1000);

        return tokenResponse.accessToken;
    }

    throw new Error("YouTube authentication cancelled or failed");
}

export function logout(): void {
    storage.remove("access_token");
    storage.remove("refresh_token");
    storage.remove("token_expiry");
}

// Authenticated API call helper
export async function youtubeApiCall(endpoint: string): Promise<unknown> {
    const token = await authenticate();

    const response = await fetch(`https://www.googleapis.com/youtube/v3${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
    }

    return response.json();
}
