import { getActiveAgentSet } from '../store/agencyStore'
import type { Task } from '../store/agencyStore'

// ─── Scope constraint (fixed for all agents) ──────────────────
const SCOPE_CONSTRAINT = `
SCOPE:
Your job is to produce YOUR SPECIFIC MODULE or CONTENT PIECE — not a full application.
You produce real code snippets, UI components, copy, logic, or structured content relevant to your role.
The Orchestrator will assemble ALL team outputs into the final deliverable — do NOT wrap your output in a full HTML document.
Output only what is in your area of expertise. Be thorough and complete within your module.
`.trim()

// ─── Workflow rules + response schema ─────────────────────────
const WORKFLOW_RULES = `
WORKFLOW RULES:
- You work on ONE task at a time.
- Keep your messages concise and professional. No filler text.
- Before starting a new task, evaluate if the description is complete. Call request_client_approval to clarify goals, verify your approach, or if any details are missing.
- Use the provided tools to manage tasks and communicate progress.
- You can call multiple tools at once if needed (e.g., propose multiple tasks).
- NEVER produce an empty output or silently skip a task. Always call complete_task with your result.
`.trim()

// ─── Build system prompt for a given agent ────────────────────
export function buildSystemPrompt(agentIndex: number, isBoardroom = false): string {
  const { agents, companyName } = getActiveAgentSet()
  const agent = agents.find(a => a.index === agentIndex)
  if (!agent) return ''

  const teamList = agents
    .filter((a) => !a.isPlayer)
    .map((a) => `  [ID: ${a.index}] ${a.role} (${a.department}) — ${a.mission}`)
    .join('\n')

  const boardroomNote = isBoardroom
    ? `\nCONTEXT: You are in the BOARDROOM collaborating with other agents. ` +
      `Divide the work clearly using propose_subtask, one per teammate. ` +
      `Then each agent will execute their own sub-task independently.`
    : ''

  return [
    `You are ${agent.role} at ${companyName}.`,
    `Department: ${agent.department}`,
    `Mission: ${agent.mission}`,
    `Personality: ${agent.personality}`,
    '',
    SCOPE_CONSTRAINT,
    '',
    `TEAM:\n${teamList}`,
    '',
    WORKFLOW_RULES,
    boardroomNote,
  ]
    .join('\n')
    .trim()
}

// ─── Dynamic context injected each turn ───────────────────────
export function buildDynamicContext(params: {
  clientBrief: string
  currentTask: Task | null
  taskBoardSummary: string
  boardroomContext?: string
}): string {
  const parts: string[] = [
    `CLIENT BRIEF:\n${params.clientBrief || 'Not yet defined.'}`,
    `TASK BOARD:\n${params.taskBoardSummary}`,
  ]

  if (params.currentTask) {
    parts.push(
      `YOUR CURRENT TASK [${params.currentTask.id}]:\n${params.currentTask.description}`
    )
  }

  if (params.boardroomContext) {
    parts.push(`BOARDROOM CONTEXT:\n${params.boardroomContext}`)
  }

  return parts.join('\n\n')
}

// ─── Task board summary string ────────────────────────────────
export function buildTaskBoardSummary(tasks: Task[]): string {
  if (tasks.length === 0) return 'No tasks yet.'
  return tasks
    .map(
      (t) =>
        `[${t.id}] ${t.status.toUpperCase()} — ${t.description}` +
        ` (agents: ${t.assignedAgentIds.join(', ')})`
    )
    .join('\n')
}

// ─── Conversational chat prompt (orchestrator briefing / worker approval) ─────
export function buildChatSystemPrompt(agentIndex: number): string {
  const { agents, companyName } = getActiveAgentSet()
  const agent = agents.find(a => a.index === agentIndex)
  if (!agent) return ''

  const isAM = agentIndex === 1;

  const teamList = agents
    .filter((a) => !a.isPlayer)
    .map((a) => `  [ID: ${a.index}] ${a.role} (${a.department}) — ${a.mission}`)
    .join('\n')

  const workerAgents = agents.filter((a) => !a.isPlayer && a.index !== 1)

  return [
    `You are ${agent.role} at ${companyName}.`,
    `Department: ${agent.department}`,
    `Mission: ${agent.mission}`,
    `Personality: ${agent.personality}`,
    '',
    SCOPE_CONSTRAINT,
    '',
    `TEAM (use these IDs in propose_task):\n${teamList}`,
    '',
    'CONTEXT:',
    isAM
      ? 'You are the Orchestrator/Account Manager. The client is briefing you to start a project.'
      : 'The client has approached you. If you have an ON_HOLD task, they are providing feedback so you can resume.',
    '',
    'RULES:',
    '- ALWAYS produce a non-empty text response — no exceptions.',
    ...(isAM ? [
      `- WORKER AGENTS you can assign tasks to: ${workerAgents.map(a => `[ID:${a.index}] ${a.role}`).join(', ')}`,
      '- DECISION RULE: The moment the client gives you ANYTHING actionable (a project name, idea, feature, or answers a question) you MUST: (1) call update_client_brief with a full brief, (2) call propose_task once for EACH worker agent with a specific task description. NO MORE QUESTIONS after that.',
      '- Only ask ONE clarifying question if the very first message is "hi" or completely empty — never more than one.',
      '- After calling propose_task for all workers, confirm work has started in your text reply.',
    ] : [
      '- IF the client provided the feedback you needed to continue: call receive_client_approval.',
      '- IF your task is now fully done based on client input: call complete_task with your full output.',
    ]),
    '- Keep replies under 3 sentences.',
  ]
    .join('\n')
    .trim()
}
