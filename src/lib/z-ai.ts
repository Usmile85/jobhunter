import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync, writeFileSync } from 'fs';

/**
 * Call z-ai chat CLI and return the parsed response content.
 * Uses temp files for prompt input to avoid shell escaping issues.
 */
export async function zaiChat(prompt: string, systemPrompt: string): Promise<string> {
  const outputFile = `/tmp/z-ai-output-${Date.now()}.json`;
  const promptFile = `/tmp/z-ai-prompt-${Date.now()}.txt`;
  const systemFile = `/tmp/z-ai-system-${Date.now()}.txt`;

  try {
    // Write prompts to temp files to avoid shell escaping issues
    writeFileSync(promptFile, prompt, 'utf-8');
    writeFileSync(systemFile, systemPrompt, 'utf-8');

    const command = `z-ai chat --prompt "$(cat ${promptFile})" --system "$(cat ${systemFile})" --output ${outputFile}`;
    execSync(command, { timeout: 120000, maxBuffer: 10 * 1024 * 1024, shell: '/bin/bash' });

    if (!existsSync(outputFile)) {
      throw new Error('z-ai chat did not produce output file');
    }

    const raw = readFileSync(outputFile, 'utf-8');
    const parsed = JSON.parse(raw);

    const content = parsed?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in z-ai chat response');
    }

    return content;
  } finally {
    // Clean up temp files
    for (const f of [outputFile, promptFile, systemFile]) {
      try { if (existsSync(f)) unlinkSync(f); } catch {}
    }
  }
}

/**
 * Call z-ai chat CLI and parse the response as JSON.
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
 * The z-ai CLI returns results directly as a JSON array.
 */
export async function zaiWebSearch(query: string, num: number = 10): Promise<Array<{ name: string; url: string; snippet?: string; host_name?: string }>> {
  const outputFile = `/tmp/z-ai-output-${Date.now()}.json`;

  try {
    const args = JSON.stringify({ query, num });
    const argsFile = `/tmp/z-ai-args-${Date.now()}.json`;
    writeFileSync(argsFile, args, 'utf-8');

    const command = `z-ai function --name "web_search" --args "$(cat ${argsFile})" --output ${outputFile}`;
    execSync(command, { timeout: 120000, maxBuffer: 10 * 1024 * 1024, shell: '/bin/bash' });

    if (!existsSync(outputFile)) {
      throw new Error('z-ai web_search did not produce output file');
    }

    const raw = readFileSync(outputFile, 'utf-8');
    const parsed = JSON.parse(raw);

    // The API returns results directly as an array, or wrapped in { results: [...] }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed?.results && Array.isArray(parsed.results)) {
      return parsed.results;
    }

    return [];
  } finally {
    try { if (existsSync(outputFile)) unlinkSync(outputFile); } catch {}
  }
}
