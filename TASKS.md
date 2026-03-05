# TASKS

## P0 - Critical
- [x] (Setup) Create `package.json` with required dependencies and scripts. Depends on: none. Success: `package.json` contains exact stack versions and scripts.
- [x] (Setup) Create `tsconfig.json` with strict settings. Depends on: none. Success: `tsconfig.json` matches required compiler options.
- [x] (Setup) Create `.gitignore` to exclude secrets/logs. Depends on: none. Success: ignores `config.json`, `accounts.txt`, `.env`, `logs/`.
- [x] (Setup) Create `src/main.ts` Electron main entry. Depends on: P0 Setup package/tsconfig. Success: app boots and creates main window.
- [x] (Setup) Create `src/config/defaults.json` with safe defaults. Depends on: none. Success: JSON parses and covers all config fields.
- [x] (Config) Implement `src/config/config.ts` loader/validator. Depends on: defaults.json, types.ts. Success: loads env/JSON, validates ranges, returns typed config.
- [x] (Utils) Implement `src/utils/types.ts` with enums/interfaces and type guards. Depends on: none. Success: all core types exported, no `any`.
- [x] (Utils) Implement `src/utils/Logger.ts` with rotating file logs. Depends on: package.json. Success: logs to per-module files with rotation.
- [x] (Database) Implement `src/database/Database.ts` initialize SQLite. Depends on: types.ts, config.ts. Success: opens DB, creates tables + indexes.
- [x] (Database) Create initial migration in `src/database/migrations/`. Depends on: Database.ts. Success: schema for messages exists.
- [x] (Chat) Implement `src/chat/ChatLogger.ts` rolling buffer + DB insert. Depends on: Database.ts, types.ts. Success: keeps last 200 in memory, writes all to DB.
- [x] (Utils) Implement `src/utils/RateLimiter.ts` token bucket. Depends on: types.ts. Success: enforces 20/30s, async wait when empty.
- [x] (Utils) Implement `src/utils/Reconnector.ts` backoff retry logic. Depends on: Logger.ts. Success: 5 attempts with required delays.
- [x] (Accounts) Implement `src/accounts/AccountParser.ts` parse/validate. Depends on: types.ts. Success: regex validation, oauth prefix, line errors.
- [x] (Accounts) Implement `src/accounts/AccountValidator.ts` with type guards. Depends on: types.ts. Success: rejects malformed input safely.
- [x] (Accounts) Implement `src/accounts/AccountManager.ts` load/dedupe/store. Depends on: AccountParser.ts. Success: loads accounts, dedup by username, status tracked.
- [x] (Bots) Implement `src/bots/IndividualBot.ts` wrapper for tmi.js client. Depends on: BotState, RateLimiter, Logger, Reconnector. Success: connect/disconnect/send with events wired.
- [x] (Bots) Implement `src/bots/BotPool.ts` parallel connect limit. Depends on: IndividualBot.ts. Success: max 10 concurrent connects, staggered join.
- [x] (Bots) Implement `src/bots/BotManager.ts` global bot orchestration. Depends on: BotPool.ts, AccountManager.ts. Success: start/stop all, status updates.
- [x] (Chat) Implement `src/chat/ContextTracker.ts` manage conversation contexts. Depends on: types.ts. Success: last 10 messages per bot, clear after 3 min.
- [x] (Chat) Implement `src/chat/ConversationEngine.ts` decision logic. Depends on: ContextTracker.ts, MessageGenerator.ts. Success: priority rules for mentions vs idle.
- [x] (Chat) Implement `src/chat/MessageGenerator.ts` fixed + AI modes. Depends on: config.ts, types.ts. Success: generates text within limits, filters, no emojis.
- [x] (UI) Create `src/ui/App.tsx` root. Depends on: React setup. Success: renders Dashboard.
- [x] (UI) Create `src/ui/Dashboard.tsx` layout. Depends on: App.tsx. Success: sections render with placeholders.
- [x] (UI) Add `src/ui/components/AccountsTable.tsx`. Depends on: types.ts. Success: shows accounts, filters, search, export button.
- [x] (UI) Add `src/ui/components/ChatPreview.tsx`. Depends on: types.ts. Success: shows last 50 messages with highlights.
- [x] (UI) Add `src/ui/components/OnlineChart.tsx`. Depends on: Chart.js integration. Success: line chart updates every 30s.
- [x] (UI) Add `src/ui/components/ControlsPanel.tsx`. Depends on: config types. Success: sliders, mode toggle, buttons.
- [x] (UI) Add `src/ui/components/StatsBar.tsx`. Depends on: state store. Success: shows online, rate, AI cost, uptime.
- [x] (UI) Add Zustand store in `src/ui/store.ts`. Depends on: types.ts. Success: state management for UI.
- [x] (UI) Implement IPC bridge for main/renderer. Depends on: main.ts. Success: send events for accounts/bots/chat updates.
- [x] (Setup) Configure Tailwind + PostCSS. Depends on: package.json. Success: styles build and apply.
- [x] (Setup) Configure Electron builder. Depends on: package.json. Success: build script produces installer.
- [x] (Main) Implement graceful shutdown handling. Depends on: BotManager, Database. Success: PART all, close DB, exit 0.

## P1 - High
- [x] (Accounts) Implement batch test connection (5 at a time). Depends on: AccountManager, IndividualBot. Success: status updates per account.
- [x] (Accounts) Implement UI drag-and-drop file load. Depends on: UI base. Success: loads file and shows counts.
- [x] (Accounts) Implement textarea bulk paste parser. Depends on: AccountParser. Success: validates lines and shows results.
- [x] (Accounts) Implement CSV export for errors. Depends on: AccountManager. Success: downloads CSV with error rows.
- [x] (Bots) Implement floating online feature. Depends on: BotManager. Success: periodic PART/JOIN with % selection.
- [x] (Bots) Add typing delay before send. Depends on: IndividualBot. Success: 1-3s delay with jitter.
- [x] (Chat) Implement mentions parser. Depends on: types.ts. Success: regex extracts @username list.
- [x] (Chat) Implement rolling buffer prune. Depends on: ChatLogger. Success: buffer never exceeds 200.
- [x] (Chat) Implement message store cleanup (7 days). Depends on: Database.ts. Success: scheduled delete by timestamp.
- [x] (Chat) Implement bot reply to mention probability. Depends on: ConversationEngine. Success: 90% chance for replies.
- [x] (Chat) Implement idle message selection probabilities. Depends on: ConversationEngine. Success: weighted selection of message type.
- [x] (Chat) Implement bot-to-bot dialog start. Depends on: ConversationEngine. Success: selects random bot and @mentions.
- [x] (Chat) Implement per-bot cooldown 30-120s. Depends on: BotState, config. Success: no sends before cooldown.
- [x] (Chat) Implement global chat rate limiter. Depends on: RateLimiter. Success: 1-10 msg/min enforced.
- [x] (Chat) Implement streamer detection. Depends on: config. Success: flags isStreamer from username.
- [x] (Chat) Implement isBot detection. Depends on: AccountManager. Success: flags messages from our bots.
- [x] (Chat) Implement AI cost tracking. Depends on: MessageGenerator. Success: accumulates estimated spend.
- [x] (UI) Implement live account status updates. Depends on: IPC. Success: table updates without refresh.
- [x] (UI) Implement chat preview feed. Depends on: IPC. Success: last 50 messages update realtime.
- [x] (UI) Implement online chart updates. Depends on: IPC. Success: updates every 30s.
- [x] (UI) Implement filters/search. Depends on: AccountsTable. Success: filters by status and search.
- [x] (UI) Implement settings modal. Depends on: ControlsPanel. Success: modal opens and saves config.
- [x] (UI) Implement notifications/toasts. Depends on: IPC events. Success: errors surface in UI.
- [x] (Utils) Implement config persistence to disk. Depends on: config.ts. Success: saves last state safely.
- [x] (Utils) Implement secrets masking in logs. Depends on: Logger.ts. Success: tokens/passwords masked.

## P2 - Medium
- [x] (Services) Harden ViewerService playback start and activity emulation. Depends on: ViewerService. Success: playback starts more reliably, activity simulated, request blocking removed.
- [x] (Chat) Implement AI response cache. Depends on: MessageGenerator. Success: reuses frequent prompts.
- [ ] (Chat) Implement profanity filter. Depends on: MessageGenerator. Success: blocks/edits banned words.
- [ ] (Chat) Implement typo injection (5%). Depends on: MessageGenerator. Success: random typo applied.
- [ ] (Chat) Implement fixed phrases dataset loader. Depends on: MessageGenerator. Success: reads JSON file.
- [ ] (Chat) Implement phrase non-repeat per bot. Depends on: MessageGenerator. Success: no consecutive duplicates.
- [ ] (Bots) Implement connect jitter ±1s. Depends on: BotPool. Success: staggered random delay.
- [ ] (Bots) Implement welcome message after join. Depends on: MessageGenerator. Success: sends greeting after 5-15s.
- [x] (Bots) Implement ban/timeout handling. Depends on: IndividualBot. Success: status set to banned/error.
- [ ] (Database) Implement message query API. Depends on: Database.ts. Success: fetch recent messages by filters.
- [ ] (Database) Implement indexes migration verification. Depends on: Database.ts. Success: indexes exist.
- [x] (UI) Implement uptime display. Depends on: StatsBar. Success: shows hh:mm:ss.
- [x] (UI) Implement AI mode key input. Depends on: ControlsPanel. Success: stored securely, masked.
- [x] (UI) Implement CSV export action. Depends on: AccountsTable. Success: triggers export.
- [ ] (Utils) Implement scheduler utility. Depends on: types.ts. Success: jittered intervals helper.
- [ ] (Utils) Implement performance guardrails. Depends on: Logger.ts. Success: warns on high memory/cpu.
- [ ] (Accounts) Implement account status persistence. Depends on: config persistence. Success: restores statuses.
- [ ] (Chat) Implement streamer activity detection. Depends on: ChatLogger. Success: identify active streamer messages.
- [ ] (Chat) Implement active viewer count adjustment. Depends on: ConversationEngine. Success: reduce activity when many viewers.

## P3 - Low
- [ ] (UI) Polish styling and layout. Depends on: base UI. Success: consistent spacing/colors.
- [ ] (UI) Add icons for status. Depends on: AccountsTable. Success: visual status icons.
- [ ] (UI) Add keyboard shortcuts. Depends on: ControlsPanel. Success: shortcuts work.
- [ ] (Bots) Add bot personality profiles. Depends on: ConversationEngine. Success: profiles influence message type.
- [ ] (Chat) Add message clustering analytics. Depends on: Database.ts. Success: basic stats per 10m.
- [ ] (Chat) Add additional idle phrases pack. Depends on: fixed phrases loader. Success: extra JSON file.
- [ ] (Utils) Add telemetry opt-in. Depends on: config. Success: optional toggle stored.
- [ ] (Setup) Add CI workflow. Depends on: repo git. Success: lint/test on push.
- [x] (Docs) Add README with setup steps. Depends on: package.json. Success: clear instructions.
- [ ] (Docs) Add CONTRIBUTING guide. Depends on: README. Success: contribution steps listed.













