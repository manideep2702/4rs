import { LLMProvider, LLMMessage, LLMToolDefinition, LLMResponse, LLMToolCall } from '../types';

export class OpenAICompatibleProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async generateCompletion(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemInstruction?: string,
    modelName: string = 'qwen-turbo',
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
        openaiMessages.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.name,
        });
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
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`API error ${res.status}: ${errorBody}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;

    if (!choice) {
      return { content: null };
    }

    const content = choice.content || null;
    let toolCalls: LLMToolCall[] | undefined;

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      toolCalls = choice.tool_calls.map((tc: any) => ({
        id: tc.id || Math.random().toString(36).substring(7),
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
    }

    return {
      content,
      tool_calls: toolCalls,
    };
  }
}
