import { GeminiProvider } from './providers/GeminiProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';
import { NvidiaProvider } from './providers/NvidiaProvider';
import { LLMProvider, LLMConfig } from './types';

const QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export class LLMFactory {
  static getProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'gemini':
        return new GeminiProvider(config.apiKey || '');
      case 'qwen':
        return new OpenAICompatibleProvider(config.apiKey || '', config.baseUrl || QWEN_BASE_URL);
      case 'openai':
        return new OpenAICompatibleProvider(config.apiKey || '', config.baseUrl || OPENAI_BASE_URL);
      case 'local':
        return new OpenAICompatibleProvider(config.apiKey || '', config.baseUrl || 'http://localhost:11434/v1');
      case 'nvidia':
        return new NvidiaProvider(config.apiKey || '', config.baseUrl);
      default:
        throw new Error(`Provider ${config.provider} not supported`);
    }
  }
}
