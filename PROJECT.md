# The Maxxyyy — Project Documentation

## Overview

**The Delegation** is a high-performance 3D multi-agent simulation that lets users delegate complex projects to a team of autonomous AI agents working inside a shared 3D office environment. Rather than prompting a single LLM, users brief a full agency — characters navigate the office, claim workstations, collaborate with each other, and produce structured deliverables.

**Live Demo:** https://4rs.vercel.app/

---

## Table of Contents

1. [Project Goals](#project-goals)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Architecture](#architecture)
5. [Agency System](#agency-system)
6. [3D Engine](#3d-engine)
7. [LLM Providers](#llm-providers)
8. [State Management](#state-management)
9. [Components](#components)
10. [Agent Sets](#agent-sets)
11. [Configuration](#configuration)
12. [Scripts](#scripts)
13. [Deployment](#deployment)
14. [Licensing](#licensing)

---

## Project Goals

- Replace single-turn prompting with autonomous multi-agent delegation
- Embody AI agents as navigating characters in a shared 3D workspace
- Support multiple LLM providers via a unified interface (BYOK)
- Provide real-time visibility into agent actions via Kanban, chat, and action log panels

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| UI Framework | React 19 |
| Language | TypeScript ~5.8 |
| 3D Engine | Three.js r183 (WebGPU) |
| Build Tool | Vite 6.2 |
| Styling | Tailwind CSS 4.1 |
| State Management | Zustand 5.0 |
| Animation | Motion 12.23 |
| Icons | Lucide React 0.546 |
| Pathfinding | three-pathfinding 1.3 |
| LLM (Gemini) | @google/genai 1.29 |
| Deployment | Vercel |

---

## Directory Structure

```
the-delegation-main/
├── index.html                        # HTML entry point
├── vite.config.ts                    # Vite config (env vars, proxy)
├── tsconfig.json                     # TypeScript config
├── vercel.json                       # Vercel SPA rewrite rules
├── package.json                      # Scripts & dependencies
├── LICENSE                           # Dual MIT + CC BY-NC 4.0
├── README.md                         # Brief project readme
│
├── public/
│   ├── models/
│   │   ├── office.glb               # 3D office environment asset
│   │   └── character.glb            # Rigged character model
│   ├── images/                      # UI image assets
│   └── vendor/                      # Third-party static assets
│
└── src/
    ├── App.tsx                      # Root component; layout, canvas, panels
    ├── main.tsx                     # ReactDOM entry point
    ├── index.css                    # Global styles
    ├── types.ts                     # Core TypeScript interfaces
    │
    ├── components/                  # React UI components
    │   ├── Header.tsx               # Top navigation bar
    │   ├── SimulationView.tsx       # 3D canvas wrapper
    │   ├── UIOverlay.tsx            # 3D-to-2D screen position overlay
    │   ├── InspectorPanel.tsx       # Agent selection & chat sidebar
    │   ├── KanbanPanel.tsx          # Task board (by status)
    │   ├── ActionLogPanel.tsx       # Chronological LLM tool call log
    │   ├── ChatPanel.tsx            # Real-time chat with agents
    │   ├── BYOKModal.tsx            # API key configuration modal
    │   ├── FinalOutputModal.tsx     # Final project deliverable viewer
    │   ├── AgentSetPickerModal.tsx  # Team/agency selection modal
    │   ├── DeleteTaskModal.tsx      # Task deletion confirmation
    │   ├── ResetModal.tsx           # Project reset dialog
    │   ├── ProjectView.tsx          # Client brief input view
    │   ├── AgentView.tsx            # Single agent profile view
    │   └── InfoModal.tsx            # Help & information modal
    │
    ├── services/
    │   ├── agencyService.ts         # LLM calling, prompt building, response parsing
    │   ├── toolHandlerService.ts    # Processes agent tool call results
    │   └── llm/
    │       ├── types.ts             # LLM provider interfaces
    │       ├── LLMFactory.ts        # Multi-provider factory (selects provider by config)
    │       ├── toolDefinitions.ts   # Agent tool schemas (function call definitions)
    │       └── providers/
    │           ├── GeminiProvider.ts              # Google Gemini
    │           ├── OpenAICompatibleProvider.ts    # OpenAI, Anthropic, Qwen, Ollama
    │           └── NvidiaProvider.ts              # Nvidia NIM API
    │
    ├── hooks/
    │   ├── useAgencyOrchestrator.ts # Main orchestration loop (triggers agent turns)
    │   ├── useChatAvailability.ts   # Chat state (which agent is available)
    │   ├── useDarkMode.ts           # Theme toggle
    │   └── useElapsedTime.ts        # Task elapsed time tracker
    │
    ├── store/
    │   ├── useStore.ts              # UI/character state (Zustand)
    │   └── agencyStore.ts           # Project/agency state (Zustand)
    │
    ├── data/
    │   └── agents.ts                # Predefined agent set definitions
    │
    ├── prompts/
    │   └── agentPrompts.ts          # System prompt builders per agent role
    │
    └── three/                       # Three.js 3D engine layer
        ├── SceneManager.ts          # Scene orchestration, init, animation loop
        ├── SceneContext.ts          # React context for 3D scene access
        ├── CharacterController.ts   # Player character input controller
        ├── constants.ts             # 3D scene constants & configuration
        ├── core/
        │   ├── Engine.ts            # WebGPU renderer setup
        │   └── Stage.ts             # Camera, scene, lighting setup
        ├── entities/
        │   └── CharacterManager.ts  # GPU-instanced character rendering + TSL shaders
        ├── behavior/
        │   ├── CharacterStateMachine.ts  # Animation state transitions
        │   ├── AgentStateBuffer.ts       # GPU buffer for agent states
        │   └── ExpressionBuffer.ts       # Facial expression system
        ├── drivers/
        │   ├── DriverManager.ts     # Coordinates NPC and player drivers
        │   ├── NpcAgentDriver.ts    # AI-driven NPC behavior (move, sit, talk, work)
        │   └── PlayerInputDriver.ts # Player keyboard/mouse input
        ├── input/
        │   └── InputManager.ts      # Raw keyboard/mouse event handling
        ├── pathfinding/
        │   ├── NavMeshManager.ts    # Navigation mesh via three-pathfinding
        │   └── PathAgent.ts         # Per-agent path state & progress
        └── world/
            ├── PoiManager.ts        # Points of Interest (desks, seats, workstations)
            └── WorldManager.ts      # Office asset loading & scene lighting
```

---

## Architecture

### High-Level Flow

```
User Brief
    │
    ▼
useAgencyOrchestrator (React hook)
    │
    ├─► agencyService.ts ──► LLMFactory ──► Provider (Gemini / OpenAI / Nvidia / ...)
    │        │                                       │
    │        └── builds system prompt + history      └── returns function call
    │
    ▼
toolHandlerService.ts
    │   Processes tool calls:
    │   propose_task / complete_task / request_client_approval / ...
    │
    ▼
agencyStore (Zustand)
    │   Updates: tasks, actionLog, agentHistories, phase
    │
    ▼
React UI + Three.js Scene
    │   KanbanPanel, ActionLogPanel, InspectorPanel
    │   NpcAgentDriver moves characters to desks, triggers animations
```

### Project Phases

| Phase | Description |
|-------|-------------|
| `idle` | Waiting for a client brief |
| `briefing` | Orchestrator agent analyzing the brief and proposing tasks |
| `working` | Specialist agents executing assigned tasks |
| `awaiting_approval` | An agent has requested client input |
| `done` | All tasks complete; final output available |

---

## Agency System

### Roles

- **Player (index 0)**: The client who writes the brief and approves tasks
- **Orchestrator (index 1)**: Account Manager / Director who breaks the brief into tasks and assigns them
- **Specialists (index 2+)**: Domain experts who execute individual tasks

### Agent Tool Set (LLM Function Calls)

| Tool | Description |
|------|-------------|
| `propose_task` | Create and assign a new task to a team member |
| `propose_subtask` | Divide collaborative work among specialists (boardroom mode) |
| `request_client_approval` | Pause and ask client for input or approval |
| `receive_client_approval` | Resume after client responds |
| `complete_task` | Submit a completed task with its output (code, content, etc.) |

### Task Statuses

| Status | Meaning |
|--------|---------|
| `scheduled` | Queued, not yet started |
| `in_progress` | Agent actively working on it |
| `on_hold` | Waiting for client approval |
| `done` | Completed with output |

---

## 3D Engine

Built on **Three.js r183** with **WebGPU** rendering.

### Key Systems

| System | File | Description |
|--------|------|-------------|
| Renderer | `Engine.ts` | WebGPU renderer initialization |
| Scene/Camera | `Stage.ts` | Perspective camera, scene, ambient/directional lights |
| Characters | `CharacterManager.ts` | GPU-instanced rendering; TSL shaders for up to N characters simultaneously |
| Animations | `CharacterStateMachine.ts` | Declarative state machine (IDLE → WALK → SIT_DOWN → SIT_WORK, etc.) |
| Expressions | `ExpressionBuffer.ts` | Per-character facial morph targets (happy, sad, surprised, wink, etc.) |
| Pathfinding | `NavMeshManager.ts` | Navigation mesh using `three-pathfinding` |
| Behavior | `NpcAgentDriver.ts` | Drives NPC movement, desk claims, animation triggers based on agency state |
| World | `WorldManager.ts` | Loads `office.glb`, sets up office furniture, lighting |
| POIs | `PoiManager.ts` | Defines/manages Points of Interest (desk seats agents can claim) |

### Character Animations

| Animation | Trigger |
|-----------|---------|
| `IDLE` | Standing, not doing anything |
| `WALK` | Moving to destination |
| `TALK` | Speaking to another agent |
| `LISTEN` | Receiving information |
| `SIT_DOWN` | Transition to seated |
| `SIT_IDLE` | Seated, idle |
| `SIT_WORK` | Seated, working at desk |
| `LOOK_AROUND` | Scanning environment |
| `HAPPY` | Positive reaction |
| `SAD` | Negative reaction |
| `WAVE` | Greeting |

### Facial Expressions

`idle` · `listening` · `neutral` · `surprised` · `happy` · `sick` · `wink` · `doubtful` · `sad`

---

## LLM Providers

The `LLMFactory` selects a provider based on the user's saved config:

| Provider | ID | Notes |
|----------|----|-------|
| Google Gemini | `gemini` | Via `@google/genai` SDK |
| OpenAI | `openai` | Standard OpenAI API |
| Anthropic | `anthropic` | Via OpenAI-compatible endpoint |
| Qwen (Alibaba) | `qwen` | Via OpenAI-compatible endpoint |
| Ollama (local) | `local` | Self-hosted, no API key needed |
| Nvidia NIM | `nvidia` | Via proxy at `/nvidia-api/*` |

### BYOK Configuration

Users configure their API key at runtime via the **BYOK Modal**. Config is stored in `localStorage` under `byok-config`:

```json
{
  "provider": "gemini | openai | anthropic | qwen | local | nvidia",
  "apiKey": "user-provided-key",
  "model": "model-name",
  "baseUrl": "optional-override-base-url"
}
```

A `GEMINI_API_KEY` environment variable can pre-populate the Gemini key at build time.

---

## State Management

Two Zustand stores manage all runtime state.

### `agencyStore` — Project & Agency State

```typescript
{
  clientBrief: string
  phase: 'idle' | 'briefing' | 'working' | 'awaiting_approval' | 'done'
  finalOutput: string | null
  tasks: Task[]
  actionLog: ActionLogEntry[]
  debugLog: DebugLogEntry[]
  agentHistories: Record<number, LLMMessage[]>
  agentSummaries: Record<number, string>
  boardroomHistories: Record<string, LLMMessage[]>
  selectedAgentSetId: string
  isKanbanOpen: boolean
  isLogOpen: boolean
  isPaused: boolean
  pendingApprovalTaskId: string | null
}
```

### `useStore` — UI & Character State

```typescript
{
  isThinking: boolean
  selectedNpcIndex: number | null
  hoveredNpcIndex: number | null
  hoveredPoiId: string | null
  npcScreenPositions: Record<number, { x: number; y: number }>
  chatMessages: ChatMessage[]
  llmConfig: { provider, apiKey, model }
}
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root layout: header, 3D canvas, panels, modals |
| `SimulationView.tsx` | Mounts the Three.js canvas |
| `UIOverlay.tsx` | Projects 3D agent positions to screen coordinates for name tags |
| `Header.tsx` | Top bar with project title, controls, dark mode toggle |
| `InspectorPanel.tsx` | Right sidebar: agent list, selected agent info, chat interface |
| `KanbanPanel.tsx` | Task board grouped by status (scheduled / in_progress / on_hold / done) |
| `ActionLogPanel.tsx` | Chronological log of every agent tool call |
| `ChatPanel.tsx` | Real-time chat interface with a selected agent |
| `ProjectView.tsx` | Input form for the client brief |
| `AgentView.tsx` | Profile card for a single agent |
| `BYOKModal.tsx` | Provider and API key configuration |
| `FinalOutputModal.tsx` | Displays final project deliverable when phase = `done` |
| `AgentSetPickerModal.tsx` | Choose which agency to simulate |
| `DeleteTaskModal.tsx` | Confirm task deletion |
| `ResetModal.tsx` | Confirm full project reset |
| `InfoModal.tsx` | Help and about information |

---

## Agent Sets

Four predefined agencies ship with the project:

### 1. Looma — Marketing Agency
5 NPCs: Account Manager, Designer, Developer, Marketing Expert, Sales Lead

### 2. Pixxel AI Games — Game Studio
3 NPCs: Game Director, Technical Architect

### 3. SonicAI Bloom Records — Music Production
5 NPCs: Music Producer, Rhythm Expert, Harmony Expert, Melody Expert, Lyrics Expert

### 4. Le Robot Gourmet — Restaurant
3 NPCs: Executive Chef, Sommelier, Experience Designer

---

## Configuration

### `vite.config.ts`

- Exposes `GEMINI_API_KEY` as a compile-time env var
- Proxies `/nvidia-api/*` → `https://integrate.api.nvidia.com/*` (for CORS)

### `vercel.json`

- Rewrites all routes to `index.html` for SPA client-side routing
- Rewrites `/nvidia-api/*` → Nvidia API (production proxy)

### `tsconfig.json`

- Target: `ES2022`
- JSX: `react-jsx`
- Strict mode enabled

---

## Scripts

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Compile TypeScript + bundle to dist/
npm run preview   # Serve production build locally
npm run clean     # Delete dist/ directory
npm run lint      # Type-check only (tsc --noEmit)
```

---

## Deployment

The project deploys to **Vercel** as a static SPA.

- No backend server
- All LLM calls are made directly from the browser to provider APIs
- Nvidia API calls are proxied through Vercel Edge Rewrites to avoid CORS
- All state is client-side (Zustand + localStorage); no database

---

## Licensing

This project uses a **dual license**:

| Part | License |
|------|---------|
| Source code (`src/`, configs) | MIT License |
| 3D assets (`public/models/`) | Creative Commons BY-NC 4.0 |

The 3D assets may not be used for commercial purposes without explicit permission.

---

## Roadmap (from README)

- [ ] Multi-model support per agent (different LLMs for different roles)
- [ ] Custom team builder (define your own agent set)
- [ ] Rich deliverables (formatted documents, diagrams, code files)
- [ ] Office editor (customize workspace layout)
- [ ] Agent memory across sessions
