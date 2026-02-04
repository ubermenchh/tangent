# Tangent Roadmap: Better Than Siri & Google Assistant

## Why Tangent Can Win

| Feature | Siri/Google | Tangent |
|---------|-------------|---------|
| True app control | Limited APIs only | Full accessibility access |
| Multi-step tasks | Basic | Unlimited via LLM |
| Custom automations | Shortcuts/Routines | Hooks + Skills |
| Privacy | Cloud-dependent | On-device, your data |
| Extensibility | Closed | Open, add any skill |

---

## Phase 1: Foundation (Current + Quick Wins)

### Core Agent
- [x] LLM integration (Gemini)
- [x] Tool system with registry
- [x] Accessibility service (screen control)
- [x] Basic app launching with intents
- [x] Fix re-execution bug (prompt improvement)
- [ ] Add intent launching tool (native module)
- [ ] Improve error handling (graceful failures)

### UX Polish
- [x] Streaming responses (show text as it generates)
- [x] Tool call visualization (show what agent is doing)
- [x] Cancel button (stop current task)
- [ ] Clear chat (reset conversation)
- [ ] Chat persistence (save/load conversations)

---

## Phase 2: Background Agent

### Task Execution
- [x] Android Foreground Service (agent stays alive)
- [x] Task store (track active/completed tasks)
- [x] Progress notifications (real-time updates)
- [x] Confirmation gates (approve sensitive actions)
- [x] Deep links (tap notification to return)
- [x] Task queue (handle multiple requests)

### Reliability
- [x] Retry logic (retry failed tool calls)
- [x] Timeout handling (don't hang forever)
- [x] Error recovery (recover from crashes)
- [x] State persistence (resume after kill)

---

## Phase 3: Skills System

### Core Skills Framework
- [ ] Skill interface (standard structure)
- [ ] Skill registry (load/enable/disable)
- [ ] Dynamic prompt composition (combine skills)
- [ ] Skill-specific tools (extend capabilities)

### Built-in Skills
- [ ] Social Media (X, Instagram, WhatsApp, Telegram)
- [ ] Shopping (Amazon, Flipkart, Myntra, Swiggy, Zomato)
- [ ] Productivity (Calendar, Email, Notes, Reminders)
- [ ] Navigation (Maps, Uber, Ola)
- [ ] Entertainment (YouTube, Spotify, Netflix)
- [ ] Communication (Calls, SMS, WhatsApp messages)
- [ ] Finance (UPI payments, bank balance, expenses)

### Skill Management UI
- [ ] Skills settings page (enable/disable)
- [ ] Skill descriptions (what each can do)
- [ ] Skill permissions (what access needed)

---

## Phase 4: Hooks & Automation

### Hook Types
- [ ] Notification hooks (react to incoming notifications)
- [ ] Schedule hooks (cron-based triggers)
- [ ] App hooks (app open/close events)
- [ ] Location hooks (geofence triggers)
- [ ] Battery hooks (low battery actions)
- [ ] Time-of-day hooks (morning/evening routines)

### Hook Infrastructure
- [ ] Notification listener service (read all notifications)
- [ ] Background scheduler (WorkManager/AlarmManager)
- [ ] Event bus (route events to hooks)
- [ ] Cooldown system (prevent spam)

### Pre-built Automations
- [ ] Morning briefing (weather, calendar, news)
- [ ] Message summaries (summarize WhatsApp groups)
- [ ] Smart replies (suggest responses)
- [ ] Battery saver (auto-close apps)
- [ ] Focus modes (silence notifications intelligently)

---

## Phase 5: Voice & Multi-modal

### Voice Input
- [ ] Speech-to-text (expo-speech or Whisper)
- [ ] Wake word detection ("Hey Tangent")
- [ ] Continuous listening mode
- [ ] Voice commands while in other apps

### Voice Output
- [ ] Text-to-speech responses (ElevenLabs or system TTS)
- [ ] Conversational voice mode
- [ ] Read notifications aloud

### Vision
- [ ] Screenshot analysis (send screen to vision model)
- [ ] Camera integration (analyze what you see)
- [ ] Document scanning (OCR + understanding)
- [ ] QR/barcode reading

---

## Phase 6: Advanced Intelligence

### Context Awareness
- [ ] Location context (home, work, commute)
- [ ] Time context (morning, work hours, evening)
- [ ] Calendar context (upcoming meetings)
- [ ] App context (what app is open)
- [ ] Conversation memory (remember preferences)

### Proactive Intelligence
- [ ] Smart suggestions (based on patterns)
- [ ] Anomaly detection ("You usually call Mom on Sundays")
- [ ] Predictive actions (pre-fetch info you'll need)
- [ ] Learning from corrections (improve over time)

### Multi-Agent
- [ ] Specialized sub-agents (shopping agent, research agent)
- [ ] Agent handoff (route to best agent for task)
- [ ] Parallel execution (multiple agents working together)

---

## Phase 7: Privacy & Security

### Data Protection
- [ ] Local-first storage (MMKV encrypted)
- [ ] No cloud logging (conversations stay on device)
- [ ] Secure API key storage (SecureStore)
- [ ] Biometric lock (fingerprint/face to access)

### Action Safety
- [ ] Confirmation for sensitive actions (payments, posts, sends)
- [ ] Action audit log (what agent did)
- [ ] Undo capability (reverse recent actions)
- [ ] Rate limiting (prevent runaway actions)

### Permissions
- [ ] Granular permissions UI (what agent can access)
- [ ] Per-skill permissions (social skill can't access banking)
- [ ] Temporary permissions (allow once)

---

## Phase 8: Integrations & Ecosystem

### Communication
- [ ] WhatsApp deep integration (read/send/react)
- [ ] Telegram bot mode (control via Telegram)
- [ ] Email integration (Gmail, Outlook)
- [x] SMS integration (already have)

### Smart Home
- [ ] Google Home integration
- [ ] Alexa integration
- [ ] Home Assistant
- [ ] Local IoT devices

### Wearables
- [ ] WearOS companion (quick commands from watch)
- [ ] Notification mirroring

### Desktop
- [ ] Desktop companion app (continue tasks on PC)
- [ ] Browser extension (web automation)

---

## Phase 9: Quick Launch & Triggers

### Hardware Triggers
- [ ] Double-tap power button (system setting documentation)
- [ ] Accessibility-based power button detection (fallback)
- [ ] Volume button combo (Volume Up + Down)
- [ ] Shake gesture detection

### System Integration
- [ ] Quick Settings Tile (notification shade shortcut)
- [ ] Home screen widget (quick actions + voice input)
- [ ] Share Intent (share text/images to Tangent from any app)
- [ ] Notification reply (reply to Tangent notification directly)

### Voice Activation
- [ ] Google Assistant App Actions ("Hey Google, ask Tangent to...")
- [ ] Wake word detection ("Hey Tangent" - battery intensive)
- [ ] Headphone button trigger

### Floating Overlay
- [ ] Floating bubble (like Messenger chat heads)
- [ ] Mini chat interface overlay
- [ ] SYSTEM_ALERT_WINDOW permission handling

---

## Phase 10: Polish & Delight

### UI/UX
- [ ] Beautiful animations (Reanimated)
- [ ] Dark/light themes
- [ ] Customizable chat bubbles

### Onboarding
- [ ] Guided setup wizard
- [ ] Permission explanations
- [ ] Sample tasks to try
- [ ] Skill recommendations

### Personalization
- [ ] Custom wake word
- [ ] Voice selection (TTS voice)
- [ ] Response style (formal, casual, brief)
- [ ] Language support (Hindi, etc.)

---

## Priority Matrix

| Phase | Effort | Impact | Do When |
|-------|--------|--------|---------|
| 1. Foundation | Low | High | Now |
| 2. Background Agent | Medium | High | Next |
| 3. Skills | Medium | High | Soon |
| 4. Hooks | High | High | After Skills |
| 5. Voice | Medium | Medium | Nice to have |
| 6. Intelligence | High | High | Long-term |
| 7. Privacy | Medium | Medium | Ongoing |
| 8. Integrations | High | Medium | After core |
| 9. Quick Launch | Low-Medium | High | Quick wins available |
| 10. Polish | Low | Medium | Continuous |

---

## What Makes This Beat Siri/Google

1. **Real app control** - Not just APIs, actual UI interaction
2. **Multi-step reasoning** - LLM can plan and execute complex tasks
3. **Custom skills** - Add any capability you want
4. **Proactive hooks** - Acts without being asked
5. **Privacy** - Your data, your device
6. **Open** - See and modify everything
