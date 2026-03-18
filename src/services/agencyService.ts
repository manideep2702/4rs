import { useAgencyStore } from '../store/agencyStore'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import {
  buildSystemPrompt,
  buildChatSystemPrompt,
  buildDynamicContext,
} from '../prompts/agentPrompts'
import { LLMFactory } from './llm/LLMFactory'
import { LLMMessage } from './llm/types'
import { AGENCY_TOOLS } from './llm/toolDefinitions'
import { getActiveAgentSet } from '../store/agencyStore'

export interface AgentFunctionCall {
  name: string
  args: Record<string, unknown>
}

export interface AgentResponse {
  text: string
  functionCalls: AgentFunctionCall[]
}

// ── Reset abort controller ────────────────────────────────────
// Replaced on every reset so all in-flight callAgent promises reject immediately.
let _resetController = new AbortController();

/** Cancel every in-flight LLM call and arm a fresh signal for the next run. */
export function abortAllCalls(): void {
  _resetController.abort();
  _resetController = new AbortController();
}

/** Rejects if the current reset signal has been aborted. */
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('LLM call aborted by reset', 'AbortError');
}

/** Returns a promise that rejects as soon as the signal is aborted. */
function abortRace(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) { reject(new DOMException('LLM call aborted by reset', 'AbortError')); return; }
    signal.addEventListener('abort', () => reject(new DOMException('LLM call aborted by reset', 'AbortError')), { once: true });
  });
}

const waitForResume = (signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException('LLM call aborted by reset', 'AbortError')); return; }
      const unsub = useAgencyStore.subscribe((state, prevState) => {
        if (prevState.isPaused && !state.isPaused) {
          unsub();
          if (signal.aborted) reject(new DOMException('LLM call aborted by reset', 'AbortError'));
          else resolve();
        }
      });
      signal.addEventListener('abort', () => { unsub(); reject(new DOMException('LLM call aborted by reset', 'AbortError')); }, { once: true });
    });
  };

export async function callAgent(params: {
  agentIndex: number;
  userMessage: string;
  isBoardroom?: boolean;
  boardroomTaskId?: string;
  chatMode?: boolean;
}): Promise<AgentResponse> {
  // Capture the reset signal at call-time — if reset fires mid-call this will abort.
  const signal = _resetController.signal;
  throwIfAborted(signal);
  const { agentIndex, userMessage, isBoardroom = false, boardroomTaskId, chatMode = false } = params;
  const llmConfig = useStore.getState().llmConfig;

  let provider;
  try {
    provider = LLMFactory.getProvider(llmConfig);
  } catch (e) {
    throw e;
  }

  const agentData = getActiveAgentSet().agents.find(a => a.index === agentIndex);

  // 1. Build context
  const systemInstruction = chatMode
    ? buildChatSystemPrompt(agentIndex)
    : buildSystemPrompt(agentIndex, isBoardroom);

  const store = useAgencyStore.getState();
  const currentTask = store.tasks.find(
    (t) => t.assignedAgentIds.includes(agentIndex) && t.status === 'in_progress'
  ) ?? null;

  const dynamicContext = buildDynamicContext({
    clientBrief: store.clientBrief,
    currentTask,
    taskBoardSummary: store.tasks.map(t => `[${t.id}] ${t.status} - ${t.description}`).join('\n')
  });

  const fullUserMessage = chatMode
    ? `${dynamicContext}\n\n---\nCLIENT MESSAGE:\n${userMessage}`
    : `${dynamicContext}\n\n---\nMESSAGE:\n${userMessage}`;

  // 2. Get history from store with summarizing logic for long chats
  let history = isBoardroom && boardroomTaskId
    ? (store.boardroomHistories[boardroomTaskId] || [])
    : (store.agentHistories[agentIndex] || []);

  const agentSummary = store.agentSummaries[agentIndex] || '';

  // If the last history entry is a user message matching the current one,
  // it was pushed by SceneManager for UI snappiness. Strip it to avoid duplication —
  // we'll add the enriched version (with dynamic context).
  const lastEntry = history.length > 0 ? history[history.length - 1] : null;
  if (lastEntry?.role === 'user' && lastEntry.content === userMessage) {
    history = history.slice(0, -1);
  }

  // If agent history is too long, we keep only last N messages and use a summary
  const MAX_HISTORY = 10;
  if (!isBoardroom && history.length > MAX_HISTORY) {
    const recentHistory = history.slice(-MAX_HISTORY);
    const contextWithSummary = [
      {
        role: 'system' as const,
        content: `SUMMARY OF PREVIOUS CONVERSATION:\n${agentSummary}\n\n(The above is a summary of what you discussed with the client earlier in this project. Below are the most recent messages.)`
      },
      ...recentHistory
    ];
    history = contextWithSummary;
  }

  const messages: LLMMessage[] = [
    ...history,
    { role: 'user', content: fullUserMessage }
  ];

  // Always log the request for the technical log panel
  useAgencyStore.getState().addDebugLogEntry({
      agentIndex,
      agentName: agentData?.role || 'Unknown',
      phase: 'request',
      systemPrompt: systemInstruction,
      dynamicContext,
      messages,
      rawContent: userMessage,
      status: 'pending',
      taskId: boardroomTaskId || currentTask?.id
  });
  // PAUSE BEFORE CALL (only when debug mode on)
  if (useAgencyStore.getState().pauseOnCall) {
    useAgencyStore.getState().setPaused(true);
    await waitForResume(signal);
  }
  throwIfAborted(signal);

  // 3. Call LLM — phase-aware tool filtering
  const ORCHESTRATOR_INDEX = 1;
  let tools: typeof AGENCY_TOOLS;
  if (chatMode) {
    // Chat mode: only approval, completion, brief update, and task proposal tools
    tools = AGENCY_TOOLS.filter(t =>
      ['receive_client_approval', 'complete_task', 'update_client_brief', 'propose_task'].includes(t.function.name)
    );
  } else if (isBoardroom) {
    // Boardroom: subtask delegation + approval tools
    tools = AGENCY_TOOLS.filter(t =>
      ['propose_subtask', 'request_client_approval', 'complete_task'].includes(t.function.name)
    );
  } else if (agentIndex === ORCHESTRATOR_INDEX) {
    // Orchestrator (autonomous): orchestration tools only
    tools = AGENCY_TOOLS.filter(t =>
      ['propose_task', 'update_client_brief', 'notify_client_project_ready', 'request_client_approval'].includes(t.function.name)
    );
  } else {
    // Worker agents (autonomous): task execution tools only
    tools = AGENCY_TOOLS.filter(t =>
      ['complete_task', 'request_client_approval'].includes(t.function.name)
    );
  }

  // ── Platform proxy (Pro users without BYOK key) ──────────────
  const authState = useAuthStore.getState()
  const isPlatformMode = authState?.tier === 'pro' && !llmConfig.apiKey

  const MAX_RETRIES = 3;
  let response;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    throwIfAborted(signal);
    try {
      if (isPlatformMode && authState?.session) {
        // Route through server-side proxy — API key never leaves the server
        const proxyRes = await Promise.race([
          fetch('/api/llm/proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authState.session.access_token}`,
            },
            body: JSON.stringify({
              provider: llmConfig.provider,
              model: llmConfig.model,
              messages,
              tools,
              systemInstruction,
            }),
            signal,
          }),
          abortRace(signal),
        ]) as Response
        if (!proxyRes.ok) {
          const errText = await proxyRes.text()
          throw new Error(`Proxy ${proxyRes.status}: ${errText.slice(0, 200)}`)
        }
        response = await proxyRes.json()
      } else {
        response = await Promise.race([
          provider.generateCompletion(messages, tools, systemInstruction, llmConfig.model, signal),
          abortRace(signal),
        ])
      }

      // Guard: treat null/empty response as a retryable error
      if (!response || (response.content === null && (!response.tool_calls || response.tool_calls.length === 0))) {
        if (attempt < MAX_RETRIES - 1) {
          useAgencyStore.getState().addLogEntry({ agentIndex, action: `empty response from LLM — retrying (attempt ${attempt + 2}/${MAX_RETRIES})` })
          await new Promise(r => setTimeout(r, 2000 + attempt * 1000))
          continue
        }
        throw new Error('LLM returned empty response after retries')
      }

      break;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') throw e;
      const isRateLimit = (e as any)?.status === 429 ||
        (e as any)?.message?.includes('429') ||
        (e as any)?.message?.toLowerCase()?.includes('rate') ||
        (e as any)?.message?.toLowerCase()?.includes('quota');
      const isTimeout = (e as DOMException)?.name === 'TimeoutError' ||
        (e as Error)?.message?.toLowerCase()?.includes('timeout');

      if (attempt < MAX_RETRIES - 1 && (isRateLimit || isTimeout)) {
        const backoff = (attempt + 1) * 3000 + Math.random() * 2000;
        useAgencyStore.getState().addLogEntry({
          agentIndex,
          action: `API ${isTimeout ? 'timed out' : 'rate limited'} — retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt + 2}/${MAX_RETRIES})`,
        });
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      const errMsg = (e as Error)?.message || String(e);
      useAgencyStore.getState().addLogEntry({
        agentIndex,
        action: `API error: ${errMsg.slice(0, 120)}`,
      });

      const isAuthError = (e as any)?.status === 401 || (e as any)?.status === 403 ||
        errMsg.includes('401') || errMsg.includes('403') ||
        errMsg.toLowerCase().includes('api key') ||
        errMsg.toLowerCase().includes('unauthorized') ||
        errMsg.toLowerCase().includes('authentication') ||
        errMsg.toLowerCase().includes('invalid key') ||
        errMsg.toLowerCase().includes('permission denied');

      if (!llmConfig.apiKey) {
        useStore.getState().setBYOKError('No API key configured. Please add your API key.');
        useStore.getState().setBYOKOpen(true);
      } else if (isAuthError) {
        useStore.getState().setBYOKError(`Authentication failed: ${errMsg.slice(0, 150)}. Please check your API key.`);
        useStore.getState().setBYOKOpen(true);
      }
      throw e;
    }
  }
  if (!response) throw new Error('LLM call failed after retries');

  const text = response.content || '';
  let toolCalls = response.tool_calls || [];

  // --- SAFETY FILTER ---
  // If requesting client approval, do NOT complete task in the same turn.
  const hasApprovalRequest = toolCalls.some(tc => tc.function.name === 'request_client_approval');
  if (hasApprovalRequest) {
    toolCalls = toolCalls.filter(tc => tc.function.name !== 'complete_task');
  }

  const functionCalls = toolCalls.map(tc => ({
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments)
  }));

  // Always log the response for the technical log panel
  useAgencyStore.getState().addDebugLogEntry({
      agentIndex,
      agentName: agentData?.role || 'Unknown',
      phase: 'response',
      systemPrompt: systemInstruction,
      dynamicContext,
      messages,
      rawContent: JSON.stringify({ text, toolCalls }, null, 2),
      status: 'completed',
      taskId: boardroomTaskId || currentTask?.id
  });
  // PAUSE AFTER RESPONSE (only when debug mode on)
  if (useAgencyStore.getState().pauseOnCall) {
    useAgencyStore.getState().setPaused(true);
    await waitForResume(signal);
  }
  throwIfAborted(signal);

  // 4. Update history in store
  // In CHAT MODE, we only want to store the message if it's actual conversation or relevant feedback
  // In AUTONOMOUS MODE, we store everything as internal reasoning
  let assistantContent = response.content || '';

  // Special case: if there's a request_client_approval tool call, we want to show the question in the chat
  const approvalCall = response.tool_calls?.find(tc => tc.function.name === 'request_client_approval');
  if (approvalCall && !assistantContent) {
    try {
      const args = JSON.parse(approvalCall.function.arguments);
      if (args.question) {
        assistantContent = args.question;
      }
    } catch (e) {
      console.error("Failed to parse tool arguments for chat history", e);
    }
  }

  // Special case: if there's a propose_task tool call, show a feedback message in the chat
  const proposeCalls = response.tool_calls?.filter(tc => tc.function.name === 'propose_task') ?? [];
  if (proposeCalls.length > 0 && !assistantContent) {
    try {
      const titles = proposeCalls.map(tc => JSON.parse(tc.function.arguments).title).filter(Boolean)
      assistantContent = titles.length > 1
        ? `On it. I'm dispatching ${titles.length} tasks to the team: ${titles.map(t => `"${t}"`).join(', ')}.`
        : `On it. I'm scheduling "${titles[0] || 'the task'}" for the team.`
    } catch (e) {
      assistantContent = "On it. I'm dispatching tasks to the team."
    }
  }

  // Special case: update_client_brief with no text — generate a brief acknowledgment
  const briefCall = response.tool_calls?.find(tc => tc.function.name === 'update_client_brief');
  if (briefCall && !assistantContent && proposeCalls.length === 0) {
    assistantContent = "Got it — I've noted the brief and will assign the team shortly."
  }

  // REFINEMENT: If we are in CHAT MODE, and the assistant generated content that looks like
  // internal thoughts or task logs (and not a direct reply), we might want to skip or clean it.
  // However, the most effective way is to ensure that if CHAT MODE is false, we don't
  // push these automated "assigned task" logs into the persistent history that the chat uses.

  const assistantMessage: LLMMessage | null = assistantContent.trim() || (response.tool_calls && response.tool_calls.length > 0)
    ? {
        role: 'assistant',
        content: assistantContent,
        tool_calls: response.tool_calls
      }
    : null;

  // ONLY push to persistent history (the one shown in ChatPanel) if:
  // 1. We are explicitly in chatMode
  // 2. OR the assistant actually said something (assistantContent is not empty)
  // This prevents the "system-like" logs from autonomous cycles from polluting the chat history.
  const shouldUpdateHistory = chatMode || (assistantContent.trim().length > 0);

  if (shouldUpdateHistory) {
    // Only push assistant message if it exists (user message is now handled immediately in SceneManager for UI snappiness)
    if (assistantMessage) {
      useAgencyStore.setState((s) => {
        if (isBoardroom && boardroomTaskId) {
          return {
            boardroomHistories: {
              ...s.boardroomHistories,
              [boardroomTaskId]: [...(s.boardroomHistories[boardroomTaskId] || []), assistantMessage]
            }
          }
        } else {
          return {
            agentHistories: {
              ...s.agentHistories,
              [agentIndex]: [...(s.agentHistories[agentIndex] || []), assistantMessage]
            }
          }
        }
      });
    }
  }

  // 5. Trigger Summary Update for Agent Chats
  if (!isBoardroom && chatMode && (store.agentHistories[agentIndex]?.length || 0) > 12) {
      updateAgentSummary(agentIndex);
  }

  return { text, functionCalls };
}

async function updateAgentSummary(agentIndex: number) {
    const store = useAgencyStore.getState();
    const history = store.agentHistories[agentIndex] || [];
    const llmConfig = useStore.getState().llmConfig;
    try {
        const provider = LLMFactory.getProvider(llmConfig);
        const summaryPrompt = [
            ...history.slice(0, -4),
            { role: 'user' as const, content: 'Please summarize the conversation so far in a concise paragraph, capturing the key decisions, progress, and any outstanding tasks.' }
        ];
        const response = await provider.generateCompletion(summaryPrompt, [], 'You are an AI assistant helping an agent summarize their conversation history.', llmConfig.model);
        if (response.content) {
            store.setAgentSummary(agentIndex, response.content);
        }
    } catch (e) {
        console.error('Failed to update agent summary', e);
    }
}

// ─── Convenience wrappers ─────────────────────────────────────

/** Call the Orchestrator (index 1) */
export const callOrchestrator = (userMessage: string) =>
  callAgent({ agentIndex: 1, userMessage })

/** Call an agent in the context of a boardroom session for a given task */
export const callBoardroomAgent = (
  agentIndex: number,
  taskId: string,
  message: string
) => callAgent({ agentIndex, userMessage: message, isBoardroom: true, boardroomTaskId: taskId })
