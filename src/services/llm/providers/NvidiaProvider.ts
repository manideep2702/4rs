import { LLMProvider, LLMMessage, LLMToolDefinition, LLMResponse, LLMToolCall } from '../types';

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
    modelName: string = 'minimaxai/minimax-m2.5',
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

    const body: any = {
      model: modelName,
      messages: openaiMessages,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 8192,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`API error ${res.status}: ${errorBody}`);
    }

    // Read SSE stream and accumulate content + tool calls
    const reader = res.body?.getReader();
    if (!reader) return { content: null };

    const decoder = new TextDecoder();
    let content = '';
    let toolCallsMap: Map<number, any> = new Map();

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
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

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
          // skip malformed chunks
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

    return { content: content || null, tool_calls: toolCalls };
  }
}
