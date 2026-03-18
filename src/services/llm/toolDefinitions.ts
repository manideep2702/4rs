import { LLMToolDefinition } from './types';

export const AGENCY_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'propose_task',
      description: 'Orchestrator only. Create a new task for one or more agents.',
      parameters: {
        type: 'object',
        properties: {
          agentIds: {
            type: 'array',
            items: { type: 'integer' },
            description: 'List of agent IDs to assign the task to.',
          },
          title: {
            type: 'string',
            description: 'A very brief 2-4 word summary of the task.',
          },
          description: {
            type: 'string',
            description: 'A short 10-20 word instruction for the task.',
          },
          requiresApproval: {
            type: 'boolean',
            description: 'Whether the task requires client approval before starting.',
          },
        },
        required: ['agentIds', 'title', 'description', 'requiresApproval'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'request_client_approval',
      description: 'When you need client input to continue. Task goes on_hold.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task that needs approval.',
          },
          question: {
            type: 'string',
            description: 'The question to ask the client.',
          },
        },
        required: ['taskId', 'question'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'receive_client_approval',
      description: 'Call this ONLY when you are in a chat with the client and they have given you the approval or information you needed. This will end the chat and move the task back to in_progress.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task that has been approved.',
          },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'When your work is done. output is YOUR MODULE ONLY — a specific component, snippet, or content piece. Do NOT wrap in a full HTML document. The Orchestrator will assemble all modules into the final app.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task you completed.',
          },
          output: {
            type: 'string',
            description: 'Your specific module output: JS logic, CSS styles, HTML component, copy text, or structured content — NOT a full standalone HTML page.',
          },
        },
        required: ['taskId', 'output'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_subtask',
      description: 'Boardroom only. Assign a specific sub-task to a teammate.',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'integer',
            description: 'The ID of the agent to assign the sub-task to.',
          },
          title: {
            type: 'string',
            description: 'A very brief 2-4 word summary of the sub-task.',
          },
          description: {
            type: 'string',
            description: 'A short 10-20 word instruction for the sub-task.',
          },
        },
        required: ['agentId', 'title', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'notify_client_project_ready',
      description: 'When all tasks are completed, assemble all agent outputs into a single complete self-contained HTML/CSS/JS web app and deliver it to the client.',
      parameters: {
        type: 'object',
        properties: {
          finalWebApp: {
            type: 'string',
            description: 'A complete self-contained HTML document (<!DOCTYPE html>...) combining all agent outputs into a working interactive web app.',
          },
        },
        required: ['finalWebApp'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_client_brief',
      description: 'Orchestrator only. Call this to update or refine the official client brief based on the conversation. This does NOT start the working phase; use propose_task for that.',
      parameters: {
        type: 'object',
        properties: {
          brief: {
            type: 'string',
            description: 'The updated, refined, and summarized client brief.',
          },
        },
        required: ['brief'],
      },
    },
  },
];
