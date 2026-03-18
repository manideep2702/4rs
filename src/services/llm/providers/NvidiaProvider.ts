import { LLMProvider, LLMMessage, LLMToolDefinition, LLMResponse, LLMToolCall } from '../types';

// Routed through Vercel proxy to avoid CORS: /nvidia-api/v1 → https://integrate.api.nvidia.com/v1
const NVIDIA_BASE_URL = '/nvidia-api/v1';

export class NvidiaProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || NVIDIA_BASE_URL).replace(/\/+$/, '');
  }

  async generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName: string = 'nvidia/nemotron-3-super-120b-a12b',
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const openaiMessages: any[] = [];

    if (systemInstruction) {
      openaiMessages.push({ role: 'system', content: systemInstruction });
    }

    for (const m of messages) {
      if (m.role === 'system') {
        openaiMessages.push({ role: 'system', content: m.content });
      } else if (m.role === 'tool' && m.name) {
        openaiMessages.push({ role: 'tool', content: m.content, tool_call_id: m.name });
      } else if (m.role === 'assistant' && m.tool_calls) {
        openaiMessages.push({
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });
      } else {
        openaiMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        });
      }
    }

    // Detect thinking models (nemotron, deepseek-r1, etc.) that need reasoning budget
    const isThinkingModel =
      modelName.toLowerCase().includes('nemotron') ||
      modelName.toLowerCase().includes('deepseek-r1') ||
      modelName.toLowerCase().includes('qwq') ||
      modelName.toLowerCase().includes('thinking');

    const body: any = {
      model: modelName,
      messages: openaiMessages,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      stream: true,
    };

    // Enable thinking for reasoning models
    if (isThinkingModel) {
      body.extra_body = {
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 16384,
      };
    }

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const timeoutSignal = AbortSignal.timeout(120_000);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`NVIDIA API error ${res.status}: ${errorBody}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return { content: null };

    const decoder = new TextDecoder();
    let content = '';
    // reasoning_content is internal chain-of-thought — we collect but discard it
    let _reasoning = '';
    const toolCallsMap: Map<number, any> = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (!parsed.choices?.length) continue;
          const delta = parsed.choices[0].delta;
          if (!delta) continue;

          // reasoning_content = internal thinking, discard from final output
          if (delta.reasoning_content) {
            _reasoning += delta.reasoning_content;
          }

          if (delta.content) {
            content += delta.content;
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } });
              }
              const existing = toolCallsMap.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }

    let toolCalls: LLMToolCall[] | undefined;
    if (toolCallsMap.size > 0) {
      toolCalls = Array.from(toolCallsMap.values()).map((tc, i) => ({
        id: tc.id || `tc-${i}`,
        type: 'function' as const,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }));
    }

    // Strip any <think>...</think> blocks that appear inline in content
    const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return { content: cleanContent || null, tool_calls: toolCalls };
  }
}
