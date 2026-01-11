import { createTamagui, createTokens } from "tamagui";
import { createInterFont } from "@tamagui/font-inter";

const interFont = createInterFont({
    face: {
        400: { normal: "Inter" },
        500: { normal: "InterMedium" },
        600: { normal: "InterSemiBold" },
        700: { normal: "InterBold" },
    },
    size: {
        1: 11,
        2: 12,
        3: 13,
        4: 14,
        5: 16,
        6: 18,
        7: 20,
        8: 24,
        9: 32,
        10: 40,
    },
    lineHeight: {
        1: 16,
        2: 18,
        3: 20,
        4: 22,
        5: 24,
        6: 28,
        7: 30,
        8: 34,
        9: 42,
        10: 52,
    },
    weight: {
        4: "400",
        5: "500",
        6: "600",
        7: "700",
    },
    letterSpacing: {
        4: 0,
        5: -0.2,
        6: -0.4,
        7: -0.5,
        8: -0.6,
    },
});

const tokens = createTokens({
    color: {
        gray1: "#0a0a0b",
        gray2: "#111113",
        gray3: "#18181b",
        gray4: "#1f1f23",
        gray5: "#27272a",
        gray6: "#3f3f46",
        gray7: "#52525b",
        gray8: "#71717a",
        gray9: "#a1a1aa",
        gray10: "#d4d4d8",
        gray11: "#e4e4e7",
        gray12: "#fafafa",

        accent1: "#0d3d3d",
        accent2: "#0f4c4c",
        accent3: "#115e5e",
        accent4: "#147373",
        accent5: "#178a8a",
        accent6: "#1aa3a3",
        accent7: "#22d3d3",
        accent8: "#5eead4",
        accent9: "#99f6e4",

        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",

        transparent: "transparent",
        white: "#ffffff",
        black: "#000000",
    },

    space: {
        0: 0,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        7: 32,
        8: 40,
        9: 48,
        10: 64,
        true: 16,
    },

    size: {
        0: 0,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        7: 32,
        8: 40,
        9: 48,
        10: 64,
        true: 44,
    },

    radius: {
        0: 0,
        1: 2,
        2: 4,
        3: 6,
        4: 8,
        5: 12,
        6: 16,
        7: 20,
        8: 24,
        true: 8,
        round: 9999,
    },

    zIndex: {
        0: 0,
        1: 100,
        2: 200,
        3: 300,
        4: 400,
        5: 500,
    },
});

const darkTheme = {
    background: tokens.color.gray2,
    backgroundHover: tokens.color.gray3,
    backgroundPress: tokens.color.gray4,
    backgroundFocus: tokens.color.gray3,
    backgroundStrong: tokens.color.gray1,
    backgroundTransparent: tokens.color.transparent,

    color: tokens.color.gray10,
    colorHover: tokens.color.gray11,
    colorPress: tokens.color.gray9,
    colorFocus: tokens.color.gray11,
    colorTransparent: tokens.color.transparent,

    borderColor: tokens.color.gray4,
    borderColorHover: tokens.color.gray5,
    borderColorFocus: tokens.color.accent5,
    borderColorPress: tokens.color.gray4,

    placeholderColor: tokens.color.gray7,

    accentBackground: tokens.color.accent5,
    accentColor: tokens.color.gray1,

    shadowColor: tokens.color.black,
    shadowColorHover: tokens.color.black,
};

const lightTheme = {
    background: tokens.color.gray12,
    backgroundHover: tokens.color.gray11,
    backgroundPress: tokens.color.gray10,
    backgroundFocus: tokens.color.gray11,
    backgroundStrong: tokens.color.white,
    backgroundTransparent: tokens.color.transparent,

    color: tokens.color.gray2,
    colorHover: tokens.color.gray1,
    colorPress: tokens.color.gray3,
    colorFocus: tokens.color.gray1,
    colorTransparent: tokens.color.transparent,

    borderColor: tokens.color.gray10,
    borderColorHover: tokens.color.gray9,
    borderColorFocus: tokens.color.accent5,
    borderColorPress: tokens.color.gray10,

    placeholderColor: tokens.color.gray7,

    accentBackground: tokens.color.accent5,
    accentColor: tokens.color.white,

    shadowColor: tokens.color.gray8,
    shadowColorHover: tokens.color.gray7,
};

const config = createTamagui({
    tokens,
    themes: {
        dark: darkTheme,
        light: lightTheme,
    },
    fonts: {
        heading: interFont,
        body: interFont,
        mono: interFont,
    },
    shorthands: {
        bg: "backgroundColor",
        p: "padding",
        px: "paddingHorizontal",
        py: "paddingVertical",
        pt: "paddingTop",
        pb: "paddingBottom",
        pl: "paddingLeft",
        pr: "paddingRight",
        m: "margin",
        mx: "marginHorizontal",
        my: "marginVertical",
        mt: "marginTop",
        mb: "marginBottom",
        ml: "marginLeft",
        mr: "marginRight",
        w: "width",
        h: "height",
        br: "borderRadius",
        bw: "borderWidth",
        bc: "borderColor",
    } as const,
});

export type AppConfig = typeof config;
declare module "tamagui" {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
