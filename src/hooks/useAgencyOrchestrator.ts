import { useEffect, useRef } from 'react'
import { useSceneManager } from '../three/SceneContext'
import { useAgencyStore, type Task } from '../store/agencyStore'
import { useStore } from '../store/useStore'
import {
  callAgent,
  callOrchestrator,
  callBoardroomAgent,
  type AgentFunctionCall,
} from '../services/agencyService'
import { ToolHandlerService } from '../services/toolHandlerService'
import { getAgent } from '../data/agents'
import { getActiveAgentSet } from '../store/agencyStore'

// ── Constants ─────────────────────────────────────────────────
const ORCHESTRATOR_INDEX = 1 // Orchestrator

// ── Smart HTML assembler ───────────────────────────────────────
// Workers often output raw CSS or JS without tags. This parser separates
// styles/scripts/markup and assembles a properly structured HTML document.
function assembleTaskOutputs(tasks: { output?: string | null; description: string }[]): string {
  const styles: string[] = []
  const scripts: string[] = []
  const sections: string[] = []

  for (const task of tasks.filter(t => t.output)) {
    const raw = task.output!

    // ── Full HTML document: deconstruct it ────────────────────
    if (/<html[\s>]/i.test(raw)) {
      for (const m of raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) styles.push(m[1].trim())
      for (const m of raw.matchAll(/<script(?:\s[^>]*)?>(?!.*src=)([\s\S]*?)<\/script>/gi)) {
        const js = m[1].trim()
        if (js) scripts.push(js)
      }
      const bodyM = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyM) {
        const bodyContent = bodyM[1]
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .trim()
        if (bodyContent) sections.push(bodyContent)
      }
      continue
    }

    // ── Partial output: extract inline <style>/<script> tags first ──
    for (const m of raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) styles.push(m[1].trim())
    for (const m of raw.matchAll(/<script(?:\s[^>]*)?>(?!.*src=)([\s\S]*?)<\/script>/gi)) {
      const js = m[1].trim()
      if (js) scripts.push(js)
    }
    const stripped = raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .trim()

    if (!stripped) continue

    // ── Detect raw CSS (no HTML tags, has CSS property: value patterns) ──
    const hasCSSRules = /[\w-]+\s*:\s*[^{};,]+;/.test(stripped)
    const hasHTMLTags = /<[a-z][a-z0-9]*[\s\/>]/i.test(stripped)
    const hasJSKeywords = /\b(?:function|const|let|var|=>|document\.|window\.|addEventListener|class\s+\w)/i.test(stripped)

    if (!hasHTMLTags && hasCSSRules && !hasJSKeywords) {
      // Pure CSS block — wrap it
      styles.push(stripped)
    } else if (!hasHTMLTags && hasJSKeywords) {
      // Pure JS block — wrap it
      scripts.push(stripped)
    } else {
      // HTML content (or mixed) — goes in body
      sections.push(stripped)
    }
  }

  const stylesTag = styles.length > 0 ? `  <style>\n${styles.join('\n\n')}\n  </style>` : ''
  const scriptTag = scripts.length > 0 ? `<script>\n${scripts.join('\n\n')}\n</script>` : ''
  const bodyContent = sections.join('\n\n') || '<div style="padding:2rem;text-align:center;color:#94a3b8">No HTML content produced — check agent task outputs.</div>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Deliverable</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; min-height: 100vh; }
  </style>
${stylesTag}
</head>
<body>
${bodyContent}
${scriptTag}
</body>
</html>`
}
// Nvidia thinking models (Nemotron 120B) can take 3+ minutes per call × 3 retries
const TASK_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

class TaskTimeoutError extends Error {
  constructor() { super('TASK_TIMEOUT') }
}

// ─────────────────────────────────────────────────────────────
export function useAgencyOrchestrator() {
  const scene = useSceneManager()
  const sceneRef = useRef(scene)
  useEffect(() => { sceneRef.current = scene }, [scene])

  /** Agents currently being processed — prevents double-dispatch. */
  const runningAgents = useRef(new Set<number>())

  /**
   * Wrapper for tool handler to include local context.
   */
  const processFunctionCall = (fn: AgentFunctionCall, callerIndex: number): boolean => {
    const handled = ToolHandlerService.process(fn, callerIndex, sceneRef.current)

    // Additional side effects specific to the orchestrator hook
    if (handled && fn.name === 'complete_task') {
      runningAgents.current.delete(callerIndex)
      // Kick the NPC driver so the agent immediately wanders away from the work desk
      sceneRef.current?.kickNpcDriver(callerIndex)
      setTimeout(() => {
        checkAllTasksDone()
      }, 100)
    }

    // When an agent requests approval, it stops working — release from runningAgents
    // so it won't block re-dispatch once the user approves.
    if (handled && fn.name === 'request_client_approval') {
      runningAgents.current.delete(callerIndex)
    }

    return handled
  }

  // ── Check if all tasks done → trigger AM to wrap up ──────────
  const checkAllTasksDone = async () => {
    const store = useAgencyStore.getState()
    if (store.phase !== 'working' && store.phase !== 'awaiting_approval') return

    // Check if ALL tasks are done (if tasks is empty, it's also "all done" if we were working)
    const hasTasks = store.tasks.length > 0;
    const allDone = hasTasks && store.tasks.every((t) => t.status === 'done');
    const isEmptyWorking = !hasTasks && (store.phase === 'working' || store.phase === 'awaiting_approval');

    if (!allDone && !isEmptyWorking) return

    // Check if we already delivered the final output
    if (store.finalOutput) return

    // Check if AM is already processing something
    if (runningAgents.current.has(ORCHESTRATOR_INDEX)) return
    runningAgents.current.add(ORCHESTRATOR_INDEX)

    try {
      const outputs = store.tasks
        .filter((t) => t.output)
        .map((t) => `[${t.description}]\n${t.output}`)
        .join('\n\n---\n\n')

      store.addLogEntry({
        agentIndex: ORCHESTRATOR_INDEX,
        action: `assembling final deliverable from ${store.tasks.filter(t => t.output).length} task outputs…`,
      })

      const prompt = hasTasks
        ? `All tasks are completed. Team outputs:\n\n${outputs}\n\n` +
          `MANDATORY: Call notify_client_project_ready RIGHT NOW with a COMPLETE, PROFESSIONAL, FULLY FUNCTIONAL web application as a single self-contained HTML file.\n\n` +
          `CRITICAL REQUIREMENTS — this must be a REAL SOFTWARE PRODUCT, not a presentation:\n` +
          `- Navigation bar with working links/tabs\n` +
          `- Fully interactive JavaScript (working buttons, forms, game logic, state management)\n` +
          `- Modern CSS: gradients, shadows, hover effects, animations, responsive design\n` +
          `- Professional color palette and typography — looks like a real deployed product\n` +
          `- All features from the brief must WORK (e.g. a game must be playable, a booking form must validate input)\n` +
          `- NO slide-style sections, NO bullet lists of specs, NO "coming soon" placeholders\n` +
          `- Think Spotify, Airbnb, Linear — a polished product UI, not a Word document\n\n` +
          `Integrate all team outputs into one cohesive app. Do not explain — just call the tool with the complete HTML now.`
        : `All tasks have been removed. Call notify_client_project_ready with a brief summary HTML page explaining the project was reset.`

      const MAX_DELIVERY_ATTEMPTS = 2
      let delivered = false

      for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS && !delivered; attempt++) {
        try {
          const response = await callOrchestrator(
            attempt === 0
              ? prompt
              : `${prompt}\n\nPrevious attempt failed to call notify_client_project_ready. You MUST call it now — this is the final instruction.`
          )
          if (response.functionCalls) {
            for (const fn of response.functionCalls) {
              processFunctionCall(fn, ORCHESTRATOR_INDEX)
            }
            if (response.functionCalls.some(fn => fn.name === 'notify_client_project_ready')) {
              delivered = true
            }
          }
        } catch (attemptErr) {
          if ((attemptErr as DOMException)?.name === 'AbortError') throw attemptErr
          store.addLogEntry({
            agentIndex: ORCHESTRATOR_INDEX,
            action: `final assembly attempt ${attempt + 1} failed — ${(attemptErr as Error)?.message?.slice(0, 80) ?? 'error'}`,
          })
          // Continue to next attempt or fallback
        }
      }

      // Fallback: always runs — if orchestrator timed out or didn't call the tool, assemble directly
      if (!delivered && hasTasks) {
        const { finalOutput } = useAgencyStore.getState()
        if (!finalOutput) {
          store.addLogEntry({
            agentIndex: ORCHESTRATOR_INDEX,
            action: `using fallback assembly — combining ${store.tasks.filter(t => t.output).length} task outputs directly`,
          })
          const fallbackHtml = assembleTaskOutputs(store.tasks)
          processFunctionCall({ name: 'notify_client_project_ready', args: { finalWebApp: fallbackHtml } }, ORCHESTRATOR_INDEX)
        }
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') console.error('[Orchestrator] final delivery error:', err)
      // Last-resort fallback — even if something completely unexpected threw
      const storeNow = useAgencyStore.getState()
      if (!storeNow.finalOutput && storeNow.tasks.some(t => t.output)) {
        const emergencyHtml = assembleTaskOutputs(storeNow.tasks)
        processFunctionCall({ name: 'notify_client_project_ready', args: { finalWebApp: emergencyHtml } }, ORCHESTRATOR_INDEX)
      }
    } finally {
      runningAgents.current.delete(ORCHESTRATOR_INDEX)
    }
  }

  // ── Single-agent task work loop ───────────────────────────────
  const runSingleAgentTask = async (task: Task, agentIndex: number) => {
    await sleep(randomBetween(1500, 3000))

    const store = useAgencyStore.getState()
    store.updateTaskStatus(task.id, 'in_progress')
    store.addLogEntry({
      agentIndex,
      action: `started work on task`,
      taskId: task.id,
    })
    sceneRef.current?.setNpcWorking(agentIndex, true)

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new TaskTimeoutError()), TASK_TIMEOUT_MS)
      )
      const response = await Promise.race([
        callAgent({
          agentIndex,
          userMessage: `You have been assigned task [${task.id}]: "${task.description}".\n\n` +
            `MANDATORY: Write actual HTML/CSS/JavaScript code for your section of the web application. ` +
            `Do NOT write a business plan, strategy doc, or bullet list — write CODE that runs in a browser.\n` +
            `Examples: a styled HTML section, a working JavaScript component, a CSS animation block.\n` +
            `Call complete_task with your code. Only call request_client_approval if absolutely necessary.`,
        }),
        timeout,
      ])
      if (response.functionCalls) {
        for (const fn of response.functionCalls) {
          processFunctionCall(fn, agentIndex)
        }
      }
    } catch (err) {
      const isTimeout = err instanceof TaskTimeoutError
      const isAbort = (err as DOMException)?.name === 'AbortError'
      if (!isAbort) {
        console.error(`[Orchestrator] agent ${agentIndex} task error:`, err)
        const currentTask = useAgencyStore.getState().tasks.find(t => t.id === task.id)
        if (currentTask && currentTask.status === 'in_progress') {
          useAgencyStore.getState().updateTaskStatus(task.id, 'scheduled')
          useAgencyStore.getState().addLogEntry({
            agentIndex,
            action: isTimeout
              ? `task timed out after 10 min — resetting to retry`
              : `task reset to scheduled after API error — will retry`,
            taskId: task.id,
          })
        }
        sceneRef.current?.setNpcWorking(agentIndex, false)
      }
    } finally {
      runningAgents.current.delete(agentIndex)
    }
  }

  // ── Multi-agent boardroom task ────────────────────────────────
  const runBoardroomTask = async (task: Task) => {
    const store = useAgencyStore.getState()
    const agents = task.assignedAgentIds

    store.addLogEntry({
      agentIndex: agents[0],
      action: `gathering team in boardroom for "${task.description}"`,
      taskId: task.id,
    })

    // Move all agents to boardroom and wait for arrivals
    await new Promise<void>((resolve) => {
      let arrived = 0
      const onArrival = () => {
        arrived++
        if (arrived >= agents.length) resolve()
      }
      agents.forEach((idx) => sceneRef.current?.moveNpcToSpawn(idx, onArrival))
    })

    store.updateTaskStatus(task.id, 'in_progress')
    agents.forEach((idx) => runningAgents.current.add(idx))

    try {
      // Round-robin boardroom chat: each agent speaks once to propose subtasks
      for (const agentIndex of agents) {
        store.addLogEntry({
          agentIndex,
          action: `discussing task in boardroom — "${task.description}"`,
          taskId: task.id,
        })

        const response = await callBoardroomAgent(
          agentIndex,
          task.id,
          `Boardroom meeting for task [${task.id}]: "${task.description}". ` +
          `Client brief: "${store.clientBrief}". ` +
          `Your teammates in this meeting: ${agents.filter((i) => i !== agentIndex).map((i) => getAgent(i, getActiveAgentSet().agents)?.role).join(', ')}. ` +
          `Propose a subtask for yourself or delegate. Use propose_subtask.`,
        )

        if (response.functionCalls) {
          for (const fn of response.functionCalls) {
            processFunctionCall(fn, agentIndex)
          }
        }

        await sleep(1500)
      }

      // Mark the boardroom task itself as done (subtasks carry the real work)
      store.updateTaskStatus(task.id, 'done')
      store.addLogEntry({
        agentIndex: agents[0],
        action: `boardroom session concluded — subtasks distributed`,
        taskId: task.id,
      })
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') console.error('[Orchestrator] boardroom error:', err)
    } finally {
      agents.forEach((idx) => runningAgents.current.delete(idx))
    }
  }

  // ── Dispatch a scheduled task ─────────────────────────────────
  const dispatchTask = (task: Task) => {
    // Filter out the orchestrator — it coordinates, it doesn't execute worker tasks
    const workerIds = task.assignedAgentIds.filter((i) => i !== ORCHESTRATOR_INDEX)

    if (workerIds.length === 0) {
      // Task was assigned only to the orchestrator — skip it and mark done so checkAllTasksDone can fire
      useAgencyStore.getState().updateTaskStatus(task.id, 'done')
      useAgencyStore.getState().addLogEntry({
        agentIndex: ORCHESTRATOR_INDEX,
        action: `skipped self-assigned task — orchestrator delegates, not executes`,
        taskId: task.id,
      })
      setTimeout(() => checkAllTasksDone(), 100)
      return
    }

    const isBoardroom = workerIds.length > 1
    // Work with worker-only ids for dispatch
    const effectiveTask = { ...task, assignedAgentIds: workerIds }

    if (isBoardroom) {
      // All agents must be free
      const anyBusy = workerIds.some((i) => runningAgents.current.has(i))
      if (anyBusy) return
      workerIds.forEach((i) => runningAgents.current.add(i))
      runBoardroomTask(effectiveTask)
    } else {
      const agentIndex = workerIds[0]
      if (runningAgents.current.has(agentIndex)) return
      runningAgents.current.add(agentIndex)
      runSingleAgentTask(effectiveTask, agentIndex)
    }
  }

  // ── Agency message handler (intercepts player→NPC chat) ───────
  const handleAgencyMessage = async (
    npcIndex: number,
    text: string,
  ): Promise<string | null> => {
    const store = useAgencyStore.getState()

    // ---- Orchestrator: always route through agency service ----
    if (npcIndex === ORCHESTRATOR_INDEX) {
      if (store.phase === 'idle') {
        store.setPhase('briefing')
      }

      // Check if there's a pending approval task for the orchestrator
      const orchestratorPendingTask = store.tasks.find(
        (t) => t.status === 'on_hold' && t.assignedAgentIds.includes(ORCHESTRATOR_INDEX),
      )

      try {
        runningAgents.current.add(ORCHESTRATOR_INDEX)

        let response;
        if (orchestratorPendingTask) {
          store.updateTaskStatus(orchestratorPendingTask.id, 'in_progress')
          store.addLogEntry({
            agentIndex: 0,
            action: `approved task for Manager — resuming work`,
            taskId: orchestratorPendingTask.id,
          })

          response = await callOrchestrator(
            `Client responded to your approval request: "${text}". Incorporate their feedback. ` +
            `Call request_client_approval if you still need more input, otherwise proceed with your management tools (propose_task, update_client_brief, etc.).`
          )
          if (response.functionCalls) {
            for (const fn of response.functionCalls) {
              processFunctionCall(fn, ORCHESTRATOR_INDEX)
            }
          }
        } else {
          // Build an enriched message that forces the model to act when requirements are present
          const workerAgents = getActiveAgentSet().agents.filter(a => !a.isPlayer && a.index !== ORCHESTRATOR_INDEX)
          const agentIds = workerAgents.map(a => `[ID:${a.index}] ${a.role}`).join(', ')
          const baseEnriched = store.phase === 'briefing' || store.clientBrief
            ? `Client message: "${text}"\n\nAvailable worker agents: ${agentIds}\n\n` +
              `MANDATORY (execute in this SINGLE response, no exceptions):\n` +
              `1. Call update_client_brief with the complete project requirements.\n` +
              `2. Call propose_task ONCE for EACH worker agent listed above.\n` +
              `CRITICAL — each task description MUST be a specific CODE section of the final web app, NOT a business analysis or strategy document.\n` +
              `Examples of GOOD task descriptions: "Build the HTML layout and navigation structure", "Write the CSS styling, animations and responsive design", "Implement the JavaScript game logic and interactivity", "Create the hero section, features section and footer HTML content".\n` +
              `Examples of BAD task descriptions: "Validate Business Viability", "Develop Marketing Strategy", "Assess Brand Identity" — these produce non-code output.\n` +
              `Do NOT send only one tool call. Do NOT ask questions. Both steps are required now.`
            : text

          // ── Watchdog: retry if orchestrator talks but never dispatches tasks ──
          const MAX_DISPATCH_RETRIES = 2
          let tasksDispatched = false

          for (let attempt = 0; attempt <= MAX_DISPATCH_RETRIES && !tasksDispatched; attempt++) {
            const messageToSend = attempt === 0
              ? baseEnriched
              : `WATCHDOG ALERT: You responded but called propose_task 0 times. This is not acceptable.\n\n` +
                `Client request: "${text}"\n\nWorker agents waiting for tasks: ${agentIds}\n\n` +
                `RIGHT NOW you MUST call propose_task for EVERY agent above. ` +
                `Do not reply with text only. Tool calls are mandatory.`

            response = await callAgent({ agentIndex: ORCHESTRATOR_INDEX, userMessage: messageToSend, chatMode: true })

            if (response.functionCalls) {
              for (const fn of response.functionCalls) {
                processFunctionCall(fn, ORCHESTRATOR_INDEX)
              }
              tasksDispatched = response.functionCalls.some(fn => fn.name === 'propose_task')
            }

            if (!tasksDispatched && attempt < MAX_DISPATCH_RETRIES) {
              store.addLogEntry({
                agentIndex: ORCHESTRATOR_INDEX,
                action: `watchdog: no tasks dispatched — auto-retrying (${attempt + 1}/${MAX_DISPATCH_RETRIES})…`,
              })
              await sleep(1500)
            }
          }

          // Hard fallback: if orchestrator still hasn't dispatched, force-create tasks
          if (!tasksDispatched && (store.phase === 'briefing' || store.clientBrief)) {
            store.addLogEntry({
              agentIndex: ORCHESTRATOR_INDEX,
              action: `watchdog: orchestrator unresponsive — force-dispatching tasks to all workers`,
            })
            const brief = store.clientBrief || text
            for (const agent of workerAgents) {
              store.addTask({
                title: agent.role,
                description: `${agent.role} task for: ${brief}`,
                assignedAgentIds: [agent.index],
                status: 'scheduled',
                requiresClientApproval: false,
              })
            }
          }
        }

        return response?.text || null
      } catch (err) {
        if ((err as DOMException)?.name !== 'AbortError') {
          console.error('[Orchestrator] Orchestrator message error:', err)
          useAgencyStore.setState((s) => ({
            agentHistories: {
              ...s.agentHistories,
              [ORCHESTRATOR_INDEX]: [
                ...(s.agentHistories[ORCHESTRATOR_INDEX] || []),
                { role: 'assistant', content: 'Something went wrong reaching the AI. Please check your API key in settings and try again.' },
              ],
            },
          }))
        }
        return null
      } finally {
        runningAgents.current.delete(ORCHESTRATOR_INDEX)
      }
    }

    // ---- NPC with pending approval ----
    const pendingTask = store.tasks.find(
      (t) => t.status === 'on_hold' && t.assignedAgentIds.includes(npcIndex),
    )
    if (pendingTask) {
      store.updateTaskStatus(pendingTask.id, 'in_progress')
      store.addLogEntry({
        agentIndex: 0,
        action: `approved task for ${getAgent(npcIndex, getActiveAgentSet().agents)?.role} — resuming work`,
        taskId: pendingTask.id,
      })

      runningAgents.current.add(npcIndex)
      try {
        sceneRef.current?.setNpcWorking(npcIndex, true)

        // Single combined call: incorporate feedback and complete
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new TaskTimeoutError()), TASK_TIMEOUT_MS)
        )
        const response = await Promise.race([
          callAgent({
            agentIndex: npcIndex,
            userMessage: `Client responded: "${text}". Incorporate their feedback and produce your final prompt. ` +
              `Call request_client_approval if you still need more input, if not Call complete_task with your output.`,
          }),
          timeout,
        ])

        if (response.functionCalls) {
          for (const fn of response.functionCalls) {
            processFunctionCall(fn, npcIndex)
          }
        }
        return response.text || null
      } catch (err) {
        if ((err as DOMException)?.name !== 'AbortError') {
          console.error('[Orchestrator] approval resume error:', err)
          useAgencyStore.setState((s) => ({
            agentHistories: {
              ...s.agentHistories,
              [npcIndex]: [
                ...(s.agentHistories[npcIndex] || []),
                { role: 'assistant', content: 'Something went wrong reaching the AI. Please check your API key in settings and try again.' },
              ],
            },
          }))
        }
        return null
      } finally {
        runningAgents.current.delete(npcIndex)
      }
    }

    // ---- Any other NPC: route through their LLM for a contextual response ----
    try {
      const response = await callAgent({ agentIndex: npcIndex, userMessage: text, chatMode: true })
      return response.text || null
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.error('[Orchestrator] NPC chat error:', err)
        useAgencyStore.setState((s) => ({
          agentHistories: {
            ...s.agentHistories,
            [npcIndex]: [
              ...(s.agentHistories[npcIndex] || []),
              { role: 'assistant', content: 'Something went wrong reaching the AI. Please check your API key in settings and try again.' },
            ],
          },
        }))
      }
      return null
    }
  }

  // ── Register handler + subscribe to task changes ─────────────
  useEffect(() => {
    if (!scene) return

    scene.setAgencyHandler(handleAgencyMessage)

    // Watch for new scheduled tasks and dispatch them
    const unsub = useAgencyStore.subscribe((s, prev) => {
      // ── Handle client update requests (post-delivery revisions) ──
      if (s.pendingUpdateRequest && !prev.pendingUpdateRequest) {
        const feedback = s.pendingUpdateRequest;
        useAgencyStore.getState().addLogEntry({
          agentIndex: 0,
          action: `client requested revisions: "${feedback.slice(0, 60)}${feedback.length > 60 ? '…' : ''}"`,
        });
        // Clear the pending request then re-engage orchestrator
        useAgencyStore.setState({ pendingUpdateRequest: null });
        if (!runningAgents.current.has(ORCHESTRATOR_INDEX)) {
          runningAgents.current.add(ORCHESTRATOR_INDEX);
          callOrchestrator(
            `The client has reviewed the delivered output and is requesting revisions. ` +
            `Client feedback: "${feedback}". ` +
            `Please analyze the feedback, create new revision tasks for the team using propose_task, and coordinate the update.`
          ).then((response) => {
            if (response.functionCalls) {
              for (const fn of response.functionCalls) {
                processFunctionCall(fn, ORCHESTRATOR_INDEX);
              }
            }
          }).catch((err) => {
            if ((err as DOMException)?.name !== 'AbortError') {
              console.error('[Orchestrator] revision request error:', err);
            }
          }).finally(() => {
            runningAgents.current.delete(ORCHESTRATOR_INDEX);
          });
        }
      }

      // Check if tasks changed status or were removed, making project ready
      const tasksChanged = s.tasks.some((t, i) => t.status !== prev.tasks[i]?.status) ||
                           s.tasks.length !== prev.tasks.length;

      if (tasksChanged) {
        checkAllTasksDone();
      }

      // Find tasks that just became 'scheduled' (were not present or not scheduled before)
      const newScheduled = s.tasks.filter(
        (t) =>
          t.status === 'scheduled' &&
          !prev.tasks.some((pt) => pt.id === t.id && pt.status === 'scheduled'),
      )

      if (newScheduled.length > 0) {
        const staggerDispatch = async () => {
          for (let i = 0; i < newScheduled.length; i++) {
            const task = newScheduled[i];
            if (i > 0) await sleep(3000);
            const currentStore = useAgencyStore.getState();
            const currentTask = currentStore.tasks.find(t => t.id === task.id);
            const agentIndex = task.assignedAgentIds[0];
            if (currentTask?.status === 'scheduled' && !runningAgents.current.has(agentIndex)) {
              dispatchTask(task);
            }
          }
        };
        setTimeout(() => staggerDispatch(), 2000);
      }

      // Exit chat mode only when a brand-new task (scheduled) starts for the chatted NPC.
      // Do NOT close chat on on_hold → in_progress (approval resume) — the user should
      // see the agent's acknowledgment reply before the chat closes naturally.
      const { isChatting, selectedNpcIndex } = useStore.getState()
      if (isChatting && selectedNpcIndex !== null) {
        const justStarted = s.tasks.find(
          (t) =>
            t.status === 'in_progress' &&
            t.assignedAgentIds.includes(selectedNpcIndex) &&
            prev.tasks.some((pt) => pt.id === t.id && pt.status === 'scheduled'),
        )
        if (justStarted) {
          sceneRef.current?.endChat()
        }
      }

      // When project reaches 'done', close chat if the user is talking to a non-Orchestrator agent
      if (s.phase === 'done' && prev.phase !== 'done') {
        const { isChatting: chatActive, selectedNpcIndex: selNpc } = useStore.getState()
        if (chatActive && selNpc !== null && selNpc !== ORCHESTRATOR_INDEX) {
          sceneRef.current?.endChat()
        }
      }
    })

    return () => {
      scene.setAgencyHandler(null)
      unsub()
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps
}
