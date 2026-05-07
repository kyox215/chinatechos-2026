export type ImeiRecognitionResult = {
  candidates: string[];
  rawText: string;
  best: string | null;
};

function normalizeText(text: string) {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[ \t\r\n-]/g, "");
}

function extractCandidates(text: string): string[] {
  const normalized = normalizeText(text);
  const matches = normalized.match(/\d{15}/g) ?? [];
  return Array.from(new Set(matches));
}

function luhnValid(input: string): boolean {
  if (!/^\d{15}$/.test(input)) return false;
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    let d = Number(input.charAt(i));
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export async function recognizeImeiFromImage(file: File): Promise<ImeiRecognitionResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    const candidates = extractCandidates(text);
    const validated = candidates.filter((c) => luhnValid(c));
    const best = validated[0] ?? candidates[0] ?? null;
    return { candidates: validated.length > 0 ? validated : candidates, rawText: text, best };
  } finally {
    await worker.terminate();
  }
}

