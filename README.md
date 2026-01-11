# tangent

Tangent is a mobile agent that understands natural language and executes actions on your Android Phone. It uses LM as the reasoning engine and exposes phone capabilites as callable tools.

Interaction:
```
User: Natural Language request
Agent: Selects tools, executes them, returns result
```

## Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                     TANGENT APP                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                      UI LAYER                          │  │
│  │  Chat interface, tool visualization, settings          │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │                    AGENT CORE                          │  │
│  │  Message handling, tool orchestration, state machine   │  │
│  └──────────┬─────────────────────────────────┬───────────┘  │
│             │                             │                  │
│  ┌──────────▼──────────┐      ┌───────────▼───────────────┐  │
│  │      LLM API        │      │        TOOLS              │  │
│  │  Reasoning engine   │      │  contacts, sms, files...  │  │
│  └─────────────────────┘      └───────────┬───────────────┘  │
│                                           │                  │
│                               ┌───────────▼───────────────┐  │
│                               │     NATIVE MODULES        │  │
│                               │  expo-contacts, expo-sms  │  │
│                               └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │  MOBILE OS  │
                                    └─────────────┘
```

## Prerequisites

- [Bun](https://bun.sh) - Install with `curl -fsSL https://bun.sh/install | bash`

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tangent.git
cd tangent

# Install dependencies
bun install
```

## Development

### Running the app

```bash
# Start the development server
bun start

# Start with cache cleared
bun start --clear

# Run on Android
bun run android

# Run on iOS
bun run ios

# Run on web
bun run web
```

### Code Quality

```bash
# Run ESLint
bun run lint

# Fix ESLint errors
bun run lint:fix

# Format code with Prettier
bun run format

# Check formatting
bun run format:check
```

## Project Structure

```
tangent/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout with providers
│   └── index.tsx           # Home screen (chat interface)
├── src/
│   ├── components/         # React components
│   │   └── chat/           # Chat UI components
│   ├── lib/                # Utilities and API clients
│   │   └── llm/            # LLM integration
│   ├── stores/             # Zustand state stores
│   └── types/              # TypeScript type definitions
├── assets/                 # Images, fonts, icons
├── app.json                # Expo configuration
├── tamagui.config.ts       # Tamagui theme configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── babel.config.js         # Babel configuration
```

## Building for Production

### Development Build (recommended for testing native features)

```bash
# Install expo-dev-client
bun add expo-dev-client

# Generate native projects
npx expo prebuild

# Build and run on Android
npx expo run:android

# Build and run on iOS
npx expo run:ios
```

### Production Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (first time only)
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Tech Stack

- **Framework**: Expo SDK 54 + React Native 0.81
- **Routing**: Expo Router
- **UI**: Tamagui
- **State**: Zustand
- **Storage**: MMKV
- **Language**: TypeScript

## License

MIT
