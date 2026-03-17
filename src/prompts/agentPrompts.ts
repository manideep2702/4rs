import { getActiveAgentSet } from '../store/agencyStore'
import type { Task } from '../store/agencyStore'

// ─── Scope constraint (fixed for all agents) ──────────────────
const SCOPE_CONSTRAINT = `
SCOPE:
Your deliverable is WORKING CODE or CONTENT that will be assembled into a complete web app.
You DO produce real code, real UI components, real copy, and real logic.
The final output opened by the client must be a live, interactive web app — NOT a text prompt.
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

// ─── Conversational chat prompt (no tools, no workflow) ───────
export function buildChatSystemPrompt(agentIndex: number): string {
  const { agents, companyName } = getActiveAgentSet()
  const agent = agents.find(a => a.index === agentIndex)
  if (!agent) return ''

  const isAM = agentIndex === 1;

  return [
    `You are ${agent.role} at ${companyName}.`,
    `Department: ${agent.department}`,
    `Mission: ${agent.mission}`,
    `Personality: ${agent.personality}`,
    '',
    'CONTEXT:',
    isAM
      ? 'You are the Orchestrator/Account Manager. The client is here to kick off or update a project.'
      : 'The client has approached you for a conversation. If you previously requested their approval/feedback on a task (ON_HOLD), they are here to provide it so you can resume work.',
    'Be helpful, professional, and stay in character.',
    '',
    'RULES:',
    '- ALWAYS produce a non-empty text response — no exceptions.',
    ...(isAM ? [
      '- DECISION RULE: If the client has provided ANYTHING to work with (a project idea, preferences, a feature list, or answered a previous question) → you MUST call update_client_brief THEN propose_task for every team member. Do NOT ask another question.',
      '- You are allowed ONE clarifying question per conversation, only if the client\'s very first message is completely blank or totally ambiguous (e.g. just "hi").',
      '- Once you have a project idea + any preferences (style, platform, features, etc.), that is enough — start the project immediately.',
      '- After calling propose_task for all agents, tell the client work has started and what each agent will do.',
      '- Use update_client_brief to save the brief before proposing tasks.',
    ] : [
      '- IF the client provides the feedback or approval you needed: call "receive_client_approval".',
      '- IF your work is fully done based on client input: call "complete_task" with your output.',
    ]),
    '- Keep replies concise (2-4 sentences).',
  ]
    .join('\n')
    .trim()
}
