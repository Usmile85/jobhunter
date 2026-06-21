import ZAI from 'z-ai-web-dev-sdk';

/**
 * Build ZAI config from environment variables.
 * Falls back to defaults that work on the z-ai platform.
 * On Vercel, these must be set in Settings > Environment Variables.
 */
function buildConfig() {
  return {
    baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || undefined,
    userId: process.env.ZAI_USER_ID || undefined,
    token: process.env.ZAI_TOKEN || undefined,
  };
}

/**
 * Lazy-initialised ZAI SDK instance.
 * Bypasses ZAI.create() (which reads from filesystem) and uses new ZAI(config)
 * directly with environment variables. This works on Vercel's read-only filesystem.
 */
let _zai: ZAI | null = null;

function getZAI(): ZAI {
  if (!_zai) {
    _zai = new ZAI(buildConfig());
  }
  return _zai;
}

/**
 * Call z-ai chat and return the assistant's response content.
 */
export async function zaiChat(prompt: string, systemPrompt: string): Promise<string> {
  const zai = getZAI();

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
  const zai = getZAI();

  const results = await zai.functions.invoke('web_search', { query, num });

  // The API returns results directly as an array
  if (Array.isArray(results)) {
    return results;
  }

  return [];
}
