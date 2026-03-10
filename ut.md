# Unboring.net — Creative & Strategy Agency
### Full Workflow, Team Structure & All Outputs

> A full-service creative agency covering **branding, design, development and go-to-market strategy** — powered by autonomous AI agents collaborating in a live 3D office simulation.

---

## Table of Contents

1. [Agency Overview](#1-agency-overview)
2. [Team Roster](#2-team-roster)
3. [Project Phases](#3-project-phases)
4. [Full Workflow — Step by Step](#4-full-workflow--step-by-step)
5. [Agent Behaviours & Prompts](#5-agent-behaviours--prompts)
6. [Tool Definitions (LLM Function Calls)](#6-tool-definitions-llm-function-calls)
7. [Task Lifecycle](#7-task-lifecycle)
8. [Boardroom Collaboration](#8-boardroom-collaboration)
9. [All Possible Outputs](#9-all-possible-outputs)
10. [State Management](#10-state-management)
11. [Technical Architecture](#11-technical-architecture)
12. [Workflow Diagram](#12-workflow-diagram)

---

## 1. Agency Overview

| Field               | Value                                                                              |
|---------------------|------------------------------------------------------------------------------------|
| **Agency Name**     | Unboring.net                                                                       |
| **Type**            | Creative & Strategy Agency                                                         |
| **Description**     | A full-service creative agency covering branding, design, development and go-to-market strategy. |
| **Brand Color**     | `#4387E2`                                                                          |
| **Agent Set ID**    | `marketing-agency`                                                                 |
| **Deliverable**     | A fully integrated **web app** (HTML/CSS/JS or React) generated and displayed directly in the browser based on the client's requirements. The Final Output Modal renders a live, interactive web app — not a text prompt. |

---

## 2. Team Roster

The agency has **6 members** — 1 human client (player) and 5 autonomous AI agents.

### 2.1 Client (You — the Player)

| Field            | Details                                              |
|------------------|------------------------------------------------------|
| **Index**        | `0`                                                  |
| **Department**   | Client                                               |
| **Role**         | Client                                               |
| **Expertise**    | Vision · Idea · Requirements                         |
| **Mission**      | Obtain a solid and viable proposal for my business idea. |
| **Personality**  | Demanding but open to professional suggestions.      |
| **Color**        | `#7EACEA`                                            |

---

### 2.2 Account Manager *(Orchestrator)*

| Field            | Details                                                                            |
|------------------|------------------------------------------------------------------------------------|
| **Index**        | `1`                                                                                |
| **Department**   | Coordination                                                                       |
| **Role**         | Account Manager                                                                    |
| **Expertise**    | Orchestration · Project Management · Communication                                 |
| **Mission**      | Break down the client's request into actionable missions for the team.             |
| **Personality**  | Organized, efficient, and central orchestrator.                                    |
| **Color**        | `#4387E2`                                                                          |
| **Special Role** | Primary point of contact. Manages the entire project lifecycle from brief to delivery. |

**Account Manager Responsibilities:**
- Receive and clarify the client brief
- Update and refine the official brief via `update_client_brief`
- **Always** respond to every client message — never silently ignore input
- Distribute tasks to team members via `propose_task` immediately once brief is actionable
- Ask the client for approval when needed via `request_client_approval`
- Assemble all agent outputs and deliver the final **web app** via `notify_client_project_ready`
- Does NOT start working until the brief is clear and actionable, but **must always reply** with a message or a clarifying question — never produces empty output

> ⚠️ **Critical Rule:** The Account Manager must ALWAYS produce a visible response. If the brief is unclear, ask a clarifying question. If the brief is clear, call `update_client_brief` then immediately call `propose_task` for each team member. Silent / empty responses are a bug.

---

### 2.3 Designer

| Field            | Details                                                                            |
|------------------|------------------------------------------------------------------------------------|
| **Index**        | `2`                                                                                |
| **Department**   | UX/UI                                                                              |
| **Role**         | Designer                                                                           |
| **Expertise**    | UI/UX · Aesthetics · Branding                                                      |
| **Mission**      | Ensure the aesthetics and user experience are exceptional.                         |
| **Personality**  | Creative, detail-oriented, and focused on visual harmony.                          |
| **Color**        | `#eab308`                                                                          |

**Designer Responsibilities:**
- Craft the complete UI/UX layer: visual identity, brand palette, typography, component styles
- Produce **production-ready HTML/CSS** (or React JSX) for the front-end interface
- Collaborate with Developer and Marketing Expert on design system coherence
- Request client approval when visual direction needs sign-off
- Deliver fully styled, responsive UI markup as task output

---

### 2.4 Developer

| Field            | Details                                                                            |
|------------------|------------------------------------------------------------------------------------|
| **Index**        | `3`                                                                                |
| **Department**   | Engineering                                                                        |
| **Role**         | Developer                                                                          |
| **Expertise**    | Architecture · Technical Feasibility · Tech Stack                                  |
| **Mission**      | Evaluate technical feasibility and define the necessary architecture.              |
| **Personality**  | Pragmatic, technical, and focused on robustness.                                   |
| **Color**        | `#22c55e`                                                                          |

**Developer Responsibilities:**
- Assess technical feasibility of the client's idea
- Propose and implement an appropriate tech stack and architecture
- Produce **working application logic** — JavaScript/TypeScript, API integrations, data models
- Deliver functional back-end / front-end code as task output
- Flag any blockers or trade-offs that need client decisions

---

### 2.5 Marketing Expert

| Field            | Details                                                                            |
|------------------|------------------------------------------------------------------------------------|
| **Index**        | `4`                                                                                |
| **Department**   | Marketing                                                                          |
| **Role**         | Marketing Expert                                                                   |
| **Expertise**    | Market Analysis · Target Audience · Narrative                                      |
| **Mission**      | Analyze the target audience and build the sales narrative.                         |
| **Personality**  | Strategic, persuasive, and market-savvy.                                           |
| **Color**        | `#EF52BA`                                                                          |

**Marketing Expert Responsibilities:**
- Define target audience segments and personas
- Build a compelling go-to-market narrative
- Produce **final copy, headlines, CTAs, and messaging** ready to be embedded directly in the web app
- Align messaging with design and business strategy

---

### 2.6 Sales Lead

| Field            | Details                                                                            |
|------------------|------------------------------------------------------------------------------------|
| **Index**        | `5`                                                                                |
| **Department**   | Business                                                                           |
| **Role**         | Sales Lead                                                                         |
| **Expertise**    | Profitability · Business Viability · Sales                                         |
| **Mission**      | Act as the final filter, ensuring the plan is profitable and viable.               |
| **Personality**  | Critical, realistic, and focused on return on investment.                          |
| **Color**        | `#ef4444`                                                                          |

**Sales Lead Responsibilities:**
- Review all team outputs for business viability
- Evaluate revenue potential and ROI
- Produce **pricing UI, sales flow, and conversion copy** to be integrated into the web app
- Acts as the final quality gate before delivery to client

---

## 3. Project Phases

The project moves through these phases in sequence:

```
idle  →  briefing  →  working  →  awaiting_approval  →  done
```

| Phase                | Description                                                                          |
|----------------------|--------------------------------------------------------------------------------------|
| `idle`               | No project active. Client has not yet started a conversation.                        |
| `briefing`           | Client and Account Manager are in discussion. Brief is being defined and refined.    |
| `working`            | Tasks have been assigned and agents are actively executing work at their desks.      |
| `awaiting_approval`  | One or more tasks are on hold, waiting for client sign-off before continuing.        |
| `done`               | All tasks are completed. Final output has been delivered to the client.              |

---

## 4. Full Workflow — Step by Step

### Phase 0 — Onboarding

1. Client selects the **Unboring.net** agent set from the Agency Picker.
2. The 3D office loads; all 5 AI agents are visible at their workstations.
3. Client clicks the **Account Manager** to open the Chat Panel.

---

### Phase 1 — Briefing

**Trigger:** Client initiates a chat with the Account Manager.

**Account Manager's Briefing Rules:**
- Asks clarifying questions if the brief is incomplete or vague.
- Does **not** start work until the brief is clear, specific, and actionable.
- Calls `update_client_brief` to save the agreed brief.
- Once brief is final, calls `propose_task` to assign missions to team members.

**Example client input:**
```
"I want to launch a B2B SaaS tool for freelance designers to manage client invoices."
```

**Account Manager may ask:**
- Who is the primary competitor?
- What is the pricing model — subscription or one-time?
- What platforms does this need to support (web, mobile, desktop)?

**Output of briefing phase:** An `official client brief` stored in the agency store.

---

### Phase 2 — Task Assignment (Orchestration)

Once the brief is confirmed, the Account Manager calls `propose_task` for each team member.

**Typical task assignments:**

| Agent             | Typical Task Title           | Typical Task Description                                              |
|-------------------|------------------------------|-----------------------------------------------------------------------|
| Designer          | Brand Identity Prompt        | Define brand palette, typography, UI/UX guidelines for the product.   |
| Developer         | Tech Architecture Prompt     | Evaluate feasibility and define tech stack and system architecture.   |
| Marketing Expert  | GTM Strategy Prompt          | Define target audience, value proposition, and go-to-market narrative.|
| Sales Lead        | Business Viability Prompt    | Assess profitability, pricing model, and competitive positioning.     |

Tasks can optionally require client approval before starting (`requiresApproval: true`).

---

### Phase 3 — Agent Execution (Autonomous Working)

Each agent:
1. Picks up their assigned task from the Kanban board.
2. Navigates to their workstation in the 3D office.
3. Calls the LLM with their system prompt + dynamic context (brief + task board summary).
4. Produces **working code or content** to be assembled into the final web app.
5. If they need client input at any point → calls `request_client_approval`.
6. When work is done → calls `complete_task` with their output.

**What each agent produces:**

| Agent             | Output Type                                                        |
|-------------------|--------------------------------------------------------------------|
| Designer          | Styled HTML/CSS components and visual identity implementation      |
| Developer         | Application logic, data models, routing, and JS/TS functionality  |
| Marketing Expert  | Page copy, headlines, CTAs, and messaging text for the web app    |
| Sales Lead        | Pricing tables, conversion flows, and business logic UI elements  |

---

### Phase 4 — Client Approval Loops

If an agent calls `request_client_approval`:
1. Their task moves to `on_hold` status on the Kanban.
2. The agent walks to the waiting area (spawn point) in the 3D office.
3. A notification appears for the client.
4. Client clicks the agent to open the Chat Panel and provide feedback.
5. Agent calls `receive_client_approval` → task returns to `in_progress`.
6. Agent resumes work at their workstation.

---

### Phase 5 — Boardroom Collaboration *(optional)*

For complex tasks, agents can be brought into a **Boardroom** session:
1. Account Manager creates a boardroom task.
2. Multiple agents join the virtual boardroom.
3. Each agent calls `propose_subtask` to distribute specialised work to teammates.
4. Each teammate executes their subtask independently.
5. Results are merged into a combined output.

---

### Phase 6 — Final Delivery

Once all tasks reach `done` status:
1. Account Manager reviews all outputs.
2. Calls `notify_client_project_ready` with the assembled `finalWebApp` — a complete, self-contained HTML/CSS/JS web app combining all agent outputs.
3. Project phase transitions to `done`.
4. A **Final Output Modal opens and renders the live web app** in an `<iframe>` (or inline render) directly in the browser — the client sees a working, interactive web app, NOT a text prompt.
5. Client can interact with, download the source, or deploy the web app.

---

## 5. Agent Behaviours & Prompts

Every agent's LLM call is structured as follows:

### System Prompt Template (Autonomous Mode)

```
You are {role} at Unboring.net.
Department: {department}
Mission: {mission}
Personality: {personality}

SCOPE:
Your deliverable is WORKING CODE or CONTENT that will be assembled into a complete web app.
You DO produce real code, real UI components, real copy, and real logic.
The final output opened by the client must be a live, interactive web app — NOT a text prompt.

TEAM:
  [ID: 1] Account Manager (Coordination) — Break down the client's request into actionable missions for the team.
  [ID: 2] Designer (UX/UI) — Produce styled HTML/CSS components and visual identity.
  [ID: 3] Developer (Engineering) — Produce working JS/TS logic, data models, and routing.
  [ID: 4] Marketing Expert (Marketing) — Produce final page copy, headlines, and CTAs.
  [ID: 5] Sales Lead (Business) — Produce pricing UI, conversion flows, and business logic elements.

WORKFLOW RULES:
- You work on ONE task at a time.
- Keep your messages concise and professional. No filler text.
- Before starting a new task, evaluate if the description is complete.
  Call request_client_approval to clarify goals, verify your approach, or if any details are missing.
- Use the provided tools to manage tasks and communicate progress.
- You can call multiple tools at once if needed (e.g., propose multiple tasks).
- NEVER produce an empty output or silently skip a task. Always call complete_task with your result.
```

### Dynamic Context (injected each turn)

```
CLIENT BRIEF:
{clientBrief}

TASK BOARD:
[task_xxx] scheduled — Brand Identity Prompt (agents: 2)
[task_yyy] in_progress — Tech Architecture Prompt (agents: 3)
...

YOUR CURRENT TASK [task_xxx]:
{task description}
```

### Chat Mode System Prompt (Account Manager)

```
You are Account Manager at Unboring.net.
Department: Coordination
Mission: Break down the client's request into actionable missions for the team.
Personality: Organized, efficient, and central orchestrator.

CONTEXT:
You are the Orchestrator. The client is here to discuss a project, refine their brief, or review final delivery.

⚠️ CRITICAL OUTPUT RULE: You MUST ALWAYS produce a visible text response. You must NEVER return an empty message or silently ignore the client's input. This is a hard rule — violation of it breaks the entire workflow.

IMPORTANT BRIEFING RULE: Do NOT start work (propose tasks) until you have a clear, specific, and actionable brief from the client.
If the client message is missing details, ask clarifying questions instead of starting the project.
Use the "update_client_brief" tool to save/update the official brief based on the client's input.
Once the brief is final and you are ready to start, use "propose_task" to assign work to the team.
Be helpful, friendly, and stay in character.

RULES:
- ALWAYS produce a non-empty text response to every client message — no exceptions.
- Be conversational and responsive. Answer the client's questions directly.
- IF the brief is unclear → ask ONE focused clarifying question in your response.
- IF the brief is clear → call `update_client_brief` then immediately call `propose_task` for each team member.
- IF the client provides the feedback or approval you needed to CONTINUE: call "receive_client_approval".
- IF the client provides the final sign-off or enough info that work is actually DONE: call "complete_task" with the assembled web app output.
- Keep replies concise (2-4 sentences) unless the client asks for detail.
- Use "update_client_brief" if project requirements have changed.
- After calling propose_task for all agents, confirm to the client that work has started and what each agent is doing.
```

---

## 6. Tool Definitions (LLM Function Calls)

The following 7 tools are available across different agent modes:

---

### `propose_task` *(Orchestrator only)*

Creates a new task on the Kanban board and assigns it to one or more agents.

```json
{
  "name": "propose_task",
  "parameters": {
    "agentIds": [2, 3],
    "title": "Brand Identity Prompt",
    "description": "Define visual identity and brand guidelines for the product.",
    "requiresApproval": false
  }
}
```

| Parameter        | Type      | Required | Description                                              |
|------------------|-----------|----------|----------------------------------------------------------|
| `agentIds`       | integer[] | ✅       | List of agent IDs to assign the task to                  |
| `title`          | string    | ✅       | A 2–4 word summary of the task                           |
| `description`    | string    | ✅       | A 10–20 word instruction for the task                    |
| `requiresApproval` | boolean | ✅       | Whether the task needs client approval before starting   |

**Effect:** Adds task with status `scheduled` to the store. Transitions project phase to `working`.

---

### `request_client_approval`

Called by any agent when they need client input before continuing.

```json
{
  "name": "request_client_approval",
  "parameters": {
    "taskId": "task_xxx",
    "question": "Should the brand lean minimal and corporate, or bold and playful?"
  }
}
```

| Parameter  | Type   | Required | Description                           |
|------------|--------|----------|---------------------------------------|
| `taskId`   | string | ✅       | The task that is being put on hold    |
| `question` | string | ✅       | The question to display to the client |

**Effect:** Task status → `on_hold`. Agent moves to spawn (waiting area). Chat session ends for worker agents.

---

### `receive_client_approval`

Called by an agent (during chat) when the client has provided the needed feedback.

```json
{
  "name": "receive_client_approval",
  "parameters": {
    "taskId": "task_xxx"
  }
}
```

| Parameter | Type   | Required | Description             |
|-----------|--------|----------|-------------------------|
| `taskId`  | string | ✅       | The task being resumed  |

**Effect:** Task status → `in_progress`. Agent returns to workstation. Chat session ends for worker agents.

---

### `complete_task`

Called when an agent's work is finished and they have code or content to deliver.

```json
{
  "name": "complete_task",
  "parameters": {
    "taskId": "task_xxx",
    "output": "<!-- Designer output: full styled HTML/CSS component -->\n<section class=\"hero\" style=\"background:#1A1A2E;color:#F5F5F5;padding:4rem 2rem;\">\n  <h1 style=\"font-family:Sora,sans-serif;font-size:2.5rem;\">Your work deserves to get paid.</h1>\n  <p>Invoicr handles the rest. Beautiful invoicing for freelance designers.</p>\n  <a href=\"#\" style=\"background:#E94560;color:#fff;padding:.75rem 2rem;border-radius:6px;\">Get Started Free</a>\n</section>"
  }
}
```

| Parameter | Type   | Required | Description                                                              |
|-----------|--------|----------|--------------------------------------------------------------------------|
| `taskId`  | string | ✅       | The task being completed                                                 |
| `output`  | string | ✅       | The agent's code or content contribution to the final web app            |

**Effect:** Task status → `done`. Output is stored on the task. Agent animation returns to idle.

---

### `propose_subtask` *(Boardroom only)*

Used during a boardroom session to delegate a specialised sub-task to a teammate.

```json
{
  "name": "propose_subtask",
  "parameters": {
    "agentId": 4,
    "title": "Audience Personas",
    "description": "Define 3 detailed buyer personas for the product's target market."
  }
}
```

| Parameter     | Type    | Required | Description                                  |
|---------------|---------|----------|----------------------------------------------|
| `agentId`     | integer | ✅       | The agent to assign the sub-task to          |
| `title`       | string  | ✅       | A 2–4 word summary                           |
| `description` | string  | ✅       | A 10–20 word instruction                     |

**Effect:** Adds a child task linked to the parent boardroom task.

---

### `notify_client_project_ready` *(Orchestrator only)*

Finalises the project and delivers the complete **web app** to the client.

```json
{
  "name": "notify_client_project_ready",
  "parameters": {
    "finalWebApp": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Invoicr</title><style>/* Designer output styles */body{margin:0;font-family:'DM Sans',sans-serif;background:#F5F5F5;color:#1A1A2E}.hero{background:#1A1A2E;color:#F5F5F5;padding:4rem 2rem;text-align:center}...</style></head><body><!-- Assembled from all agent outputs --><section class=\"hero\">...</section><!-- Developer logic --><script>/* JS from Developer output */</script></body></html>"
  }
}
```

| Parameter      | Type   | Required | Description                                                                          |
|----------------|--------|----------|--------------------------------------------------------------------------------------|
| `finalWebApp`  | string | ✅       | A complete self-contained HTML/CSS/JS web app assembled from all agent outputs       |

**Effect:** Project phase → `done`. Final Output Modal opens and **renders the live web app in an `<iframe>`**. `finalOutput` saved to store.

> ⚠️ The parameter name is `finalWebApp` (not `finalPrompt`). The modal must render this as a live web page, NOT display it as raw text.

---

### `update_client_brief` *(Orchestrator only)*

Updates the official client brief based on conversation.

```json
{
  "name": "update_client_brief",
  "parameters": {
    "brief": "B2B SaaS invoicing tool for freelance designers. Web-first. Subscription pricing ($29/mo). Key competitors: FreshBooks, Wave. Must support PDF export and multi-currency."
  }
}
```

| Parameter | Type   | Required | Description                                                     |
|-----------|--------|----------|-----------------------------------------------------------------|
| `brief`   | string | ✅       | The updated, refined, and summarised client brief               |

**Effect:** `clientBrief` updated in store. Does NOT trigger task creation by itself.

---

## 7. Task Lifecycle

Each task moves through these statuses:

```
scheduled  →  in_progress  →  done
               ↓        ↑
             on_hold ────┘
```

| Status        | Description                                                              |
|---------------|--------------------------------------------------------------------------|
| `scheduled`   | Task created, waiting to be picked up by the assigned agent(s)           |
| `in_progress` | Agent is actively working on the task                                    |
| `on_hold`     | Task paused; waiting for client input (`request_client_approval` called) |
| `done`        | Task completed; output has been saved                                    |

**Task Data Model:**

```typescript
interface Task {
  id: string;                    // e.g. "task_1234567890_abcde"
  title: string;                 // Short 2–4 word label
  description: string;           // 10–20 word instruction
  assignedAgentIds: number[];    // Array of agent indexes
  status: TaskStatus;            // scheduled | in_progress | on_hold | done
  parentTaskId?: string;         // Set for boardroom subtasks
  requiresClientApproval: boolean;
  output?: string;               // Final prompt output (max 500 words)
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
}
```

---

## 8. Boardroom Collaboration

The Boardroom is a special collaborative session where multiple agents coordinate on a single complex task.

### How it works

1. Account Manager creates a task that requires multiple specialisms.
2. All involved agents enter a shared **boardroom context** (separate conversation history keyed by `taskId`).
3. Each agent calls `propose_subtask` to assign specialised work to teammates.
4. Each teammate executes their subtask in their own autonomous loop.
5. The boardroom session persists a single `boardroomHistories[taskId]` conversation.

### Boardroom-specific tools

| Tool               | Who can call it | Purpose                                        |
|--------------------|-----------------|------------------------------------------------|
| `propose_subtask`  | Any boardroom agent | Delegate specialised work to a teammate    |
| `request_client_approval` | Any boardroom agent | Put work on hold for client input    |
| `complete_task`    | Any boardroom agent | Deliver completed output                   |

### Boardroom System Prompt Addendum

```
CONTEXT: You are in the BOARDROOM collaborating with other agents.
Divide the work clearly using propose_subtask, one per teammate.
Then each agent will execute their own sub-task independently.
```

---

## 9. All Possible Outputs

### 9.1 Per-Agent Task Outputs

Each agent produces working code or content as their deliverable, which gets assembled into the final web app:

#### Designer Output — Styled UI Components

Produces production-ready HTML/CSS covering:
- Brand colour palette applied as CSS variables / inline styles
- Typography (Google Fonts imports, heading/body font rules)
- Key page sections: hero, features, pricing, footer — fully styled
- Responsive layout using CSS Grid / Flexbox
- Button, card, and form component styles

**Example output fragment:**
```html
<style>
  :root { --primary: #1A1A2E; --accent: #E94560; --bg: #F5F5F5; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--primary); margin: 0; }
  .hero { background: var(--primary); color: #fff; padding: 5rem 2rem; text-align: center; }
  .hero h1 { font-family: 'Sora', sans-serif; font-size: 3rem; margin-bottom: 1rem; }
  .btn-primary { background: var(--accent); color: #fff; padding: .75rem 2rem; border-radius: 6px; border: none; cursor: pointer; font-size: 1rem; }
</style>
<section class="hero">
  <h1>Your work deserves to get paid.</h1>
  <p>Invoicr handles the rest — beautiful invoicing for freelance designers.</p>
  <button class="btn-primary">Get Started Free</button>
</section>
```

---

#### Developer Output — Application Logic

Produces working JavaScript/TypeScript covering:
- Core app logic (routing, state, data models)
- Form handling, validation, and interactivity
- API integration stubs or mock data
- Local state management
- Key feature implementations (e.g., invoice builder, dashboard counters)

**Example output fragment:**
```javascript
// Invoice data model
const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');

function createInvoice(client, items) {
  const invoice = {
    id: `INV-${Date.now()}`,
    client,
    items,
    total: items.reduce((sum, i) => sum + i.qty * i.rate, 0),
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  invoices.push(invoice);
  localStorage.setItem('invoices', JSON.stringify(invoices));
  renderDashboard();
  return invoice;
}

function renderDashboard() {
  document.getElementById('invoice-count').textContent = invoices.length;
  document.getElementById('total-revenue').textContent =
    '$' + invoices.reduce((s, inv) => s + inv.total, 0).toLocaleString();
}
```

---

#### Marketing Expert Output — Page Copy & CTAs

Produces final, web-ready copy covering:
- Hero headline and subheadline
- Feature section headings and descriptions
- Social proof / testimonial copy
- CTA button labels
- Onboarding microcopy and empty states

**Example output fragment:**
```html
<!-- Hero copy -->
<h1>Your work deserves to get paid.</h1>
<p>Invoicr is the invoicing tool built for freelance designers. Send beautiful invoices in under 60 seconds. Get paid faster.</p>
<button>Start for Free — No Credit Card</button>

<!-- Features copy -->
<h2>Everything you need. Nothing you don't.</h2>
<div class="feature"><h3>60-Second Invoices</h3><p>Pick a client, add line items, hit send. Done.</p></div>
<div class="feature"><h3>Multi-Currency</h3><p>Invoice globally. Get paid in your currency.</p></div>
<div class="feature"><h3>PDF Export</h3><p>Share a polished PDF or a live payment link.</p></div>
```

---

#### Sales Lead Output — Pricing UI & Conversion Elements

Produces conversion-optimised UI covering:
- Pricing table HTML with plan tiers
- Feature comparison checkmarks
- CTA anchors tied to plan selection
- Trust signals and urgency copy

**Example output fragment:**
```html
<section class="pricing">
  <h2>Simple, transparent pricing.</h2>
  <div class="pricing-grid">
    <div class="plan">
      <h3>Solo</h3><div class="price">$29<span>/mo</span></div>
      <ul><li>✓ Unlimited invoices</li><li>✓ PDF export</li><li>✓ Multi-currency</li></ul>
      <button class="btn-primary">Start Solo</button>
    </div>
    <div class="plan featured">
      <h3>Studio</h3><div class="price">$59<span>/mo</span></div>
      <ul><li>✓ Everything in Solo</li><li>✓ Up to 5 seats</li><li>✓ Priority support</li></ul>
      <button class="btn-primary">Start Studio</button>
    </div>
  </div>
  <p class="trust">Join 2,400+ freelancers already using Invoicr · Cancel anytime</p>
</section>
```
---

### 9.2 Final Assembled Web App

When all agents complete their tasks, the Account Manager calls `notify_client_project_ready` with a `finalWebApp` — a **complete, self-contained HTML file** that assembles all four agent outputs into a single, working, interactive web app.

**Final Web App Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>[Project Name]</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@700&family=DM+Sans&display=swap" rel="stylesheet">
  <!-- Designer output: CSS variables, component styles, layout -->
  <style>/* ... all Designer CSS ... */</style>
</head>
<body>
  <!-- Marketing Expert output: hero, features, testimonials, CTAs -->
  <section class="hero">...</section>
  <section class="features">...</section>

  <!-- Sales Lead output: pricing table, conversion elements -->
  <section class="pricing">...</section>

  <!-- Developer output: app logic, interactivity, data handling -->
  <script>/* ... all Developer JS ... */</script>
</body>
</html>
```

**How the Final Output Modal works:**
- The modal renders the `finalWebApp` string inside a full-size `<iframe srcdoc="...">` (or equivalent renderer).
- The client sees a **live, interactive web page** — not raw code, not a text document.
- A "View Source" / "Download" button is available alongside the preview for the client to export the code.

---

### 9.3 Action Log Entries

Every agent action is recorded in the Action Log (visible in the UI log panel):

| Log Entry Format                                   | Example                                                              |
|----------------------------------------------------|----------------------------------------------------------------------|
| `proposed task "{title}" → assigned to {roles}`    | `proposed task "Brand Identity Prompt" → assigned to Designer`       |
| `requested client approval — "{question}"`         | `requested client approval — "Should branding be minimal or bold?"`  |
| `received client approval - resuming work`         | `received client approval - resuming work`                           |
| `completed task`                                   | `completed task`                                                     |
| `proposed subtask for {role} — "{title}"`          | `proposed subtask for Marketing Expert — "Audience Personas"`        |
| `delivered final web app to client`                | `delivered final web app to client`                                  |
| `updated client brief — "{brief preview}..."`      | `updated client brief — "B2B SaaS invoicing tool for freelance..."`  |

---

### 9.4 Debug Log Entries

For every LLM call (request + response), a `DebugLogEntry` is captured:

```typescript
interface DebugLogEntry {
  id: string;
  timestamp: number;
  agentIndex: number;
  agentName: string;
  phase: 'request' | 'response';
  systemPrompt: string;
  dynamicContext: string;
  messages: LLMMessage[];
  rawContent: string;
  status: 'pending' | 'completed' | 'error';
  taskId?: string;
}
```

---

## 10. State Management

All agency state is managed via a **Zustand** store (`agencyStore.ts`) with partial localStorage persistence.

### Persisted state (survives page reload)

| Key                  | Description                               |
|----------------------|-------------------------------------------|
| `pauseOnCall`        | Debug mode — pauses before/after LLM calls |
| `selectedAgentSetId` | Which agency / team is active             |

### In-memory state (cleared on reset)

| Key                  | Type                            | Description                                          |
|----------------------|---------------------------------|------------------------------------------------------|
| `clientBrief`        | `string`                        | The official refined client brief                    |
| `phase`              | `ProjectPhase`                  | Current project phase                                |
| `finalOutput`        | `string \| null`               | The final assembled web app (complete HTML/CSS/JS document)          |
| `tasks`              | `Task[]`                        | All tasks on the Kanban board                        |
| `actionLog`          | `ActionLogEntry[]`              | Chronological log of all agent actions               |
| `debugLog`           | `DebugLogEntry[]`               | Last 30 LLM request/response pairs                   |
| `agentHistories`     | `Record<number, LLMMessage[]>`  | Per-agent conversation histories (max 10 recent)     |
| `agentSummaries`     | `Record<number, string>`        | Auto-generated summaries for long conversations      |
| `boardroomHistories` | `Record<string, LLMMessage[]>`  | Per-boardroom-task conversation histories            |
| `pendingApprovalTaskId` | `string \| null`            | Task currently awaiting client approval              |

### Key Store Actions

| Action                     | Description                                          |
|----------------------------|------------------------------------------------------|
| `setClientBrief(brief)`    | Save/update the official brief                       |
| `setPhase(phase)`          | Transition the project phase                         |
| `setFinalOutput(output)`   | Store the final deliverable                          |
| `addTask(task)`            | Add a new task to the Kanban                         |
| `removeTask(taskId)`       | Remove a task (and check if project is now complete) |
| `updateTaskStatus(id, s)`  | Advance/hold a task's status                         |
| `setTaskOutput(id, out)`   | Attach completed output to a task                    |
| `addLogEntry(entry)`       | Append to the action log                             |
| `resetProject()`           | Clear all project state and return to idle           |
| `setAgentSet(id)`          | Switch agency team (also resets project)             |

---

## 11. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Browser)                      │
├──────────────────────────┬──────────────────────────────────┤
│    Three.js WebGPU       │         React UI                 │
│  ┌─────────────────────┐ │  ┌──────────────────────────┐    │
│  │ 3D Office Scene      │ │  │ Header / BYOK Modal       │    │
│  │ - NavMesh            │ │  │ Kanban Panel             │    │
│  │ - Character NPCs     │ │  │ Chat Panel               │    │
│  │ - Workstations       │ │  │ Action Log Panel         │    │
│  │ - Boardroom          │ │  │ Inspector Panel          │    │
│  │ - Animations         │ │  │ Final Output Modal (iframe web app render) │    │
│  └─────────────────────┘ │  └──────────────────────────┘    │
│           │              │               │                  │
│           └──────────────┼───────────────┘                  │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │    Zustand Store      │                      │
│              │  agencyStore.ts       │                      │
│              │  useStore.ts          │                      │
│              └───────────┬───────────┘                      │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │   Agency Services     │                      │
│              │  agencyService.ts     │                      │
│              │  toolHandlerService.ts│                      │
│              └───────────┬───────────┘                      │
│                          │                                  │
│              ┌───────────▼───────────┐                      │
│              │      LLM Layer        │                      │
│              │  LLMFactory.ts        │                      │
│              │  providers/           │                      │
│              │  toolDefinitions.ts   │                      │
│              └───────────┬───────────┘                      │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │  HTTPS API calls
             ┌─────────────▼─────────────┐
             │   Gemini API (Google)      │
             │   (BYOK — user's key)      │
             └───────────────────────────┘
```

### Tool Filtering Per Mode

| Mode              | Available Tools                                                               |
|-------------------|-------------------------------------------------------------------------------|
| **Chat (AM)**     | `receive_client_approval`, `complete_task`, `update_client_brief`, `propose_task` |
| **Chat (Worker)** | `receive_client_approval`, `complete_task`                                    |
| **Boardroom**     | `propose_subtask`, `request_client_approval`, `complete_task`                 |
| **Orchestrator (Autonomous)** | `propose_task`, `update_client_brief`, `notify_client_project_ready`, `request_client_approval` |
| **Worker (Autonomous)**       | `complete_task`, `request_client_approval`                       |

### History Management

- Each agent maintains an individual conversation history (`agentHistories[index]`).
- Maximum **10 messages** are kept in context; older messages are replaced by an auto-generated `agentSummary`.
- Boardroom sessions maintain a separate history keyed by `taskId` (`boardroomHistories[taskId]`).
- Summary generation is triggered automatically when a chat history exceeds 12 messages.
- History is **not** persisted to localStorage — only the API key config and debug settings are.

---

## 12. Workflow Diagram

```
CLIENT
  │
  │  "I want to build a B2B invoicing SaaS for designers"
  ▼
ACCOUNT MANAGER (Chat Mode)
  │  asks clarifying questions
  │  calls update_client_brief("B2B SaaS, freelance designers, web-first...")
  │  calls propose_task → Designer (Brand Identity Prompt)
  │  calls propose_task → Developer (Tech Architecture Prompt)
  │  calls propose_task → Marketing Expert (GTM Strategy Prompt)
  │  calls propose_task → Sales Lead (Business Viability Prompt)
  │
  ├──────────────────────────────────────────────────────┐
  │                                                      │
  ▼                                                      ▼
DESIGNER (Autonomous)                           DEVELOPER (Autonomous)
  │  navigates to workstation                    │  navigates to workstation
  │  LLM generates brand prompt                  │  LLM generates tech prompt
  │  [optional] request_client_approval          │  calls complete_task(output)
  │  calls complete_task(output)                 │
  │                                              │
  ▼                                              ▼
MARKETING EXPERT (Autonomous)           SALES LEAD (Autonomous)
  │  navigates to workstation                    │  navigates to workstation
  │  LLM generates GTM prompt                    │  LLM generates viability prompt
  │  calls complete_task(output)                 │  calls complete_task(output)
  │                                              │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
                ACCOUNT MANAGER
                  │  all tasks = done
                  │  assembles final proposal
                  │  calls notify_client_project_ready(finalWebApp)
                  │
                  ▼
               CLIENT
                  │  Final Output Modal opens
                  │  Complete web app rendered live in <iframe>
                  │  Client interacts with, downloads, or deploys the web app
                  ▼
                [PROJECT DONE]
```

---

## Appendix — Output Constraint (All Agents)

> All agents at Unboring.net operate under the following output constraint:
>
> **"Your deliverable is working code or production-ready content that will be assembled into a live web app. The client's Final Output Modal must open and render an interactive web page — not a text document, not a prompt."**

This means the agency's output is always a **fully functional web app** — a self-contained HTML/CSS/JS file that the client can immediately use, deploy, or extend.

**Account Manager assembly rule:** The Account Manager must combine all agent outputs into a single valid HTML document passed to `notify_client_project_ready` as the `finalWebApp` parameter. The Final Output Modal renders this document in an `<iframe>` — if it renders as a live page, the workflow is correct.

---

*Developed by [Arturo Paracuellos](https://unboring.net) · Source Code: MIT License · 3D Assets: CC BY-NC 4.0*