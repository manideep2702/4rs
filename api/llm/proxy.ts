import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser, getUserTier, supabaseAdmin } from '../_lib/auth'

const PLATFORM_KEYS: Record<string, string | undefined> = {
  gemini: process.env.PLATFORM_GEMINI_API_KEY,
  openai: process.env.PLATFORM_OPENAI_API_KEY,
  anthropic: process.env.PLATFORM_ANTHROPIC_API_KEY,
  qwen: process.env.PLATFORM_QWEN_API_KEY,
  nvidia: process.env.PLATFORM_NVIDIA_API_KEY,
}

const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const tier = await getUserTier(user.id)
  if (tier !== 'pro') return res.status(403).json({ error: 'Pro plan required for platform API keys' })

  const { provider, model, messages, tools, systemInstruction } = req.body ?? {}
  if (!provider || !model || !messages) return res.status(400).json({ error: 'Missing required fields' })

  const platformKey = PLATFORM_KEYS[provider]
  if (!platformKey) return res.status(503).json({ error: `Platform key not configured for provider: ${provider}` })

  let responseData: { content: string | null; tool_calls?: any[] }

  try {
    if (provider === 'gemini') {
      responseData = await callGemini(platformKey, model, messages, tools, systemInstruction)
    } else {
      responseData = await callOpenAICompatible(provider, platformKey, model, messages, tools, systemInstruction)
    }
  } catch (err: any) {
    console.error('[LLM Proxy] provider error:', err.message)
    return res.status(502).json({ error: `Provider error: ${err.message}` })
  }

  // Log usage event (fire and forget)
  supabaseAdmin.from('usage_events').insert({
    user_id: user.id,
    provider,
    model,
    is_platform_key: true,
    input_tokens: estimateTokens(messages),
    output_tokens: estimateTokens([{ content: responseData.content ?? '' }]),
  }).then(() => {}).catch(() => {})

  return res.json(responseData)
}

async function callOpenAICompatible(
  provider: string, apiKey: string, model: string,
  messages: any[], tools: any[], systemInstruction: string
) {
  const baseUrl = PROVIDER_URLS[provider] ?? PROVIDER_URLS.openai
  const body: any = {
    model,
    messages: [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      ...messages,
    ],
  }
  if (tools?.length) { body.tools = tools; body.tool_choice = 'auto' }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (provider === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-beta'] = 'tools-2024-04-04'
  }

  const r = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t.slice(0, 200)}`) }
  const data = await r.json()

  const choice = data.choices?.[0]?.message
  if (!choice) return { content: null }

  return {
    content: choice.content ?? null,
    tool_calls: choice.tool_calls ?? [],
  }
}

async function callGemini(apiKey: string, model: string, messages: any[], tools: any[], systemInstruction: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const geminiMessages = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
  }))

  const body: any = {
    contents: geminiMessages,
    ...(systemInstruction ? { system_instruction: { parts: [{ text: systemInstruction }] } } : {}),
  }

  if (tools?.length) {
    body.tools = [{
      function_declarations: tools.map((t: any) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      }))
    }]
  }

  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t.slice(0, 200)}`) }
  const data = await r.json()

  const candidate = data.candidates?.[0]?.content
  if (!candidate) return { content: null }

  const textPart = candidate.parts?.find((p: any) => p.text)?.text ?? null
  const fnCalls = (candidate.parts ?? [])
    .filter((p: any) => p.functionCall)
    .map((p: any) => ({
      function: {
        name: p.functionCall.name,
        arguments: JSON.stringify(p.functionCall.args ?? {}),
      }
    }))

  return { content: textPart, tool_calls: fnCalls }
}

function estimateTokens(messages: any[]): number {
  const text = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(' ')
  return Math.ceil(text.length / 4)
}
