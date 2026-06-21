/**
 * AI module — smart router that supports two backends:
 *
 *   1. Local dev inside Space-Z sandbox → uses ZAI SDK (internal API)
 *   2. Vercel / public deployment  → uses OpenAI-compatible chat API
 *      + Serper.dev for web search
 *
 * The switch is automatic based on environment variables:
 *   - If OPENAI_API_KEY is set → OpenAI path
 *   - If ZAI_BASE_URL is set (and no OPENAI_API_KEY) → ZAI path
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  name: string;
  url: string;
  snippet?: string;
  host_name?: string;
}

// ─── Environment detection ───────────────────────────────────────────────────

const useOpenAI = !!process.env.OPENAI_API_KEY;
const useZAI = !!process.env.ZAI_BASE_URL && !process.env.OPENAI_API_KEY;

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

// ─── ZAI SDK helpers (local Space-Z dev) ────────────────────────────────────

let _zai: any = null;

async function getZAI(): Promise<any> {
  if (!_zai) {
    const { default: ZAI } = await import('z-ai-web-dev-sdk');
    _zai = new (ZAI as any)({
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY || 'Z.ai',
      chatId: process.env.ZAI_CHAT_ID,
      userId: process.env.ZAI_USER_ID,
      token: process.env.ZAI_TOKEN,
    });
  }
  return _zai;
}

async function zaiChat(prompt: string, systemPrompt: string): Promise<string> {
  const zai = await getZAI();
  const result = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in ZAI chat response');
  return content;
}

async function zaiWebSearch(
  query: string,
  num: number = 10,
): Promise<SearchResult[]> {
  const zai = await getZAI();
  const results = await zai.functions.invoke('web_search', { query, num });
  if (Array.isArray(results)) {
    return results.map((r: any) => ({
      name: r.name || '',
      url: r.url || '',
      snippet: r.snippet || '',
      host_name: r.host_name || '',
    }));
  }
  return [];
}

// ─── OpenAI-compatible helpers (Vercel / public) ─────────────────────────────

async function openaiChat(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  const url = `${OPENAI_BASE_URL}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');
  return content;
}

async function serperSearch(
  query: string,
  num: number = 10,
): Promise<SearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': SERPER_API_KEY,
    },
    body: JSON.stringify({ q: query, gl: 'us', num }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Serper API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return (data.organic_results || []).map((r: any) => ({
    name: r.title || '',
    url: r.link || '',
    snippet: r.snippet || '',
    host_name: (() => {
      try { return new URL(r.link).hostname; } catch { return ''; }
    })(),
  }));
}

// ─── Public API (auto-routes) ──────────────────────────────────────────────

/**
 * Call AI chat and return the assistant's response text.
 * Uses ZAI SDK in local dev, OpenAI-compatible API on Vercel.
 */
export async function aiChat(
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  if (useZAI) return zaiChat(prompt, systemPrompt);
  return openaiChat(prompt, systemPrompt);
}

/**
 * Call AI chat and parse the response as JSON.
 * Strips markdown code fences (```json ... ```).
 */
export async function aiChatJSON<T = unknown>(
  prompt: string,
  systemPrompt: string,
): Promise<T> {
  const content = await aiChat(prompt, systemPrompt);

  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}

/**
 * Web search — returns an array of { name, url, snippet, host_name }.
 * Uses ZAI functions in local dev, Serper.dev on Vercel.
 */
export async function aiWebSearch(
  query: string,
  num: number = 10,
): Promise<SearchResult[]> {
  if (useZAI) return zaiWebSearch(query, num);
  return serperSearch(query, num);
}
