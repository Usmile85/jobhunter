import ZAI from 'z-ai-web-dev-sdk';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Ensure a .z-ai-config file exists in the project root.
 * The z-ai SDK reads from {cwd}/.z-ai-config first, then ~/.z-ai-config, then /etc/.z-ai-config.
 * On platforms like Vercel, we support both a checked-in config file AND environment variables.
 * Environment variables take priority if set.
 */
function ensureConfigFile(): void {
  const configPath = join(process.cwd(), '.z-ai-config');

  // If config file already exists, no need to regenerate
  if (existsSync(configPath)) {
    return;
  }

  // Build config from environment variables (for Vercel / CI / etc.)
  const config: Record<string, string> = {};

  if (process.env.ZAI_BASE_URL) config.baseUrl = process.env.ZAI_BASE_URL;
  if (process.env.ZAI_API_KEY) config.apiKey = process.env.ZAI_API_KEY;
  if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID;
  if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID;
  if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN;

  // Only write if we have at least the required fields
  if (config.baseUrl && config.apiKey) {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

/**
 * Lazy-initialised ZAI SDK instance.
 * Avoids creating multiple connections across requests.
 */
let _zai: ZAI | null = null;

async function getZAI(): Promise<ZAI> {
  if (!_zai) {
    ensureConfigFile();
    _zai = await ZAI.create();
  }
  return _zai;
}

/**
 * Call z-ai chat and return the assistant's response content.
 */
export async function zaiChat(prompt: string, systemPrompt: string): Promise<string> {
  const zai = await getZAI();

  const result = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });

  const content = result?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in z-ai chat response');
  }

  return content;
}

/**
 * Call z-ai chat and parse the response as JSON.
 * Handles markdown-wrapped JSON (```json ... ```).
 */
export async function zaiChatJSON<T = unknown>(prompt: string, systemPrompt: string): Promise<T> {
  const content = await zaiChat(prompt, systemPrompt);

  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}

/**
 * Call z-ai web_search function and return the search results as an array.
 */
export async function zaiWebSearch(query: string, num: number = 10): Promise<Array<{ name: string; url: string; snippet?: string; host_name?: string }>> {
  const zai = await getZAI();

  const results = await zai.functions.invoke('web_search', { query, num });

  // The API returns results directly as an array
  if (Array.isArray(results)) {
    return results;
  }

  return [];
}
