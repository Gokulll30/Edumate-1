import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function clamp(s: string, limit = 12000) {
  if (!s) return s;
  s = s.trim();
  return s.length > limit ? s.slice(0, limit) : s;
}

function buildPrompt(notes: string, num_q: number, difficulty: string): string {
  return `
Given the notes below, create exactly ${num_q} contextually correct multiple-choice questions (MCQs) for a technical quiz.

Strict rules:
- Only use content, facts, terminology, and structure from the supplied notes.
- Each question must have exactly four options labeled "A", "B", "C", "D", all options must make sense for the question and be informed by the notes; never use generic placeholders.
- Mark the correct answer using one of "A", "B", "C", or "D".
- Give a concise answer explanation also only from the notes.
- Include a 'difficulty' and 'topic' for each MCQ.
- Always return only a compact JSON array, where each item has:
  { "question": "...", "options": ["...","...","...","..."], "answer": "A", "explanation": "...", "difficulty": "...", "topic": "..." }

Example JSON output:
[
  {
    "question": "...",
    "options": ["...","...","...","..."],
    "answer": "A",
    "explanation": "...",
    "difficulty": "medium",
    "topic": "Relational Model"
  }
]
Notes:
"""${notes}"""
  `.trim();
}

function normalize(items: any[]) {
  return (items || []).map((item: any) => {
    const opts = (item.options || []).map((x: any) => String(x)).slice(0, 4);
    while (opts.length < 4) opts.push("N/A");
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const letter = String(item.answer || "A").trim().toUpperCase();
    const idx = map[letter] ?? 0;
    return {
      question: String(item.question || "").trim(),
      options: opts,
      answerIndex: idx,
      answerLetter: "ABCD"[idx],
      explanation: String(item.explanation || "").trim(),
      difficulty: String(item.difficulty || "mixed").trim(),
      topic: String(item.topic || "General").trim(),
    };
  });
}

async function extractTextWithPdfjs(buffer: Buffer, pageLimit = 50): Promise<string> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  let out = "";
  const maxPages = Math.min(doc.numPages, pageLimit);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return out;
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.GROK_API_KEY;
  if (!key) {
    res.status(500).json({ success: false, error: "GROK_API_KEY not set" });
    return;
  }

  try {
    const Busboy = (await import("busboy")).default;
    const bb = Busboy({ headers: req.headers });

    const fileParts: Buffer[] = [];
    let fileName = "";
    const fields: Record<string, string> = {};

    await new Promise<void>((resolve, reject) => {
      bb.on("file", (_name: any, file: any, info: any) => {
        fileName = info && info.filename ? info.filename : "";
        file.on("data", (d: Buffer) => fileParts.push(d));
      });
      bb.on("field", (name: string, val: string) => {
        fields[name] = val;
      });
      bb.on("close", resolve);
      bb.on("error", reject);
      // @ts-ignore
      req.pipe(bb);
    });

    if (!fileParts.length) {
      res.status(400).json({ success: false, error: "file field is required" });
      return;
    }

    const buf = Buffer.concat(fileParts);
    const lower = (fileName || "").toLowerCase();
    const isPdf = lower.endsWith(".pdf") || buf.slice(0, 5).toString() === "%PDF-";

    let text = "";
    if (isPdf) {
      text = await extractTextWithPdfjs(buf);
    } else if (lower.endsWith(".txt")) {
      text = buf.toString("utf-8");
    } else {
      text = buf.toString("utf-8");
    }

    text = clamp(text, 12000);
    if (!text || text.length < 50) {
      res.status(400).json({ success: false, error: "Insufficient text" });
      return;
    }

    const num_q = parseInt(fields["num_q"] || "5", 10);
    const difficulty = fields["difficulty"] || "mixed";
    const prompt = buildPrompt(text, num_q, difficulty);

    // POST to Grok API's completions endpoint.
    const grokResponse = await axios.post(
      "https://api.grok.xai.com/v1/completions",
      {
        model: "grok-1", // Can be updated to any supported model.
        prompt: prompt,
        max_tokens: 2048,
        temperature: 0.3
      },
      {
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        }
      }
    );

    let raw = grokResponse.data?.choices?.[0]?.text || '';
    // Try to extract JSON array from model output.
    let items: any[];
    try {
      const firstBracket = raw.indexOf("[");
      const lastBracket = raw.lastIndexOf("]");
      if (firstBracket >= 0 && lastBracket > firstBracket) {
        raw = raw.substring(firstBracket, lastBracket + 1);
      }
      items = JSON.parse(raw);
    } catch (err) {
      res.status(500).json({ success: false, error: "Could not parse JSON from Grok output" });
      return;
    }

    const quiz = normalize(items);
    res.status(200).json({ success: true, quiz });
  } catch (e: any) {
    console.error("upload: error", e?.message || e);
    res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
