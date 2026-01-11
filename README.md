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
│  └──────────┬─────────────────────────────┬───────────────┘  │
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