// Frontend client for the AI copilot proxy (ai-server/main.py, powered by ollamafreeapi).

const AI_BASE = (import.meta as any).env?.VITE_AI_URL || 'http://localhost:8000';

export async function askAI(
  prompt: string,
  opts?: { model?: string; temperature?: number }
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${AI_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: opts?.model, temperature: opts?.temperature ?? 0.4 }),
    });
  } catch {
    throw new Error('AI service is offline. Start it with: cd ai-server && uvicorn main:app --port 8000');
  }
  if (!res.ok) throw new Error(`AI service error (HTTP ${res.status}).`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'AI request failed.');
  return (data.text as string) || '';
}

// Strip anything that could identify a patient before text leaves the app.
// (The free model tier is not a PHI-safe environment.)
export function deidentify(text: string, terms: (string | undefined)[]): string {
  let out = text || '';
  for (const t of terms) {
    if (t && t.trim().length > 1) {
      out = out.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[redacted]');
    }
  }
  // CNIC-style and long digit sequences
  out = out.replace(/\b\d{5}-?\d{7}-?\d\b/g, '[id]').replace(/\b\d{7,}\b/g, '[number]');
  return out;
}
