import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: import the function implementation directly to avoid the package's CLI/sample path
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfParseMod from 'pdf-parse/lib/pdf-parse.js';
const pdfParse = (pdfParseMod as any).default || (pdfParseMod as any);

// JSON schema for Gemini JSON mode
const MCQ_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    required: ['question', 'options', 'answer', 'explanation', 'difficulty', 'topic'],
    properties: {
      question: { type: 'string' },
      options: { type: 'array', items: { type: 'string' } },
      answer: { type: 'string', description: 'One of A,B,C,D' },
      explanation: { type: 'string' },
      difficulty: { type: 'string' },
      topic: { type: 'string' },
    },
  },
};

function clamp(s: string, limit = 12000) {
  if (!s) return s;
  s = s.trim();
  return s.length > limit ? s.slice(0, limit) : s;
}

function buildPrompt(notes: string, num_q: number, difficulty: string) {
  return `
Create exactly ${num_q} multiple-choice questions from the notes below.
Rules:
- Exactly 4 options in "options" labeled A-D.
- "answer" is one of A,B,C,D only.
- Provide a one-sentence "explanation".
- Include "topic" and "difficulty".
Return ONLY JSON matching the provided schema.
Notes:
"""${notes}"""`;
}

function normalize(items: any[]) {
  return (items || []).map((item: any) => {
    const opts = (item.options || []).map((x: any) => String(x)).slice(0, 4);
    while (opts.length < 4) opts.push('N/A');
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const letter = String(item.answer || 'A').trim().toUpperCase();
    const idx = map[letter] ?? 0;
    return {
      question: String(item.question || '').trim(),
      options: opts,
      answerIndex: idx,
      answerLetter: 'ABCD'[idx],
      explanation: String(item.explanation || '').trim(),
      difficulty: String(item.difficulty || 'mixed').trim(),
      topic: String(item.topic || 'General').trim(),
    };
  });
}

// Disable default body parsing so we can stream multipart
export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not set' });

  try {
    console.log('upload: start');

    const Busboy = (await import('busboy')).default;
    const bb = Busboy({ headers: req.headers });

    const fileParts: Buffer[] = [];
    let fileName = '';
    const fields: Record<string, string> = {};

    await new Promise<void>((resolve, reject) => {
      bb.on('file', (_name, file, info) => {
        fileName = info.filename || '';
        console.log('upload: got-file', fileName);
        file.on('data', (d: Buffer) => fileParts.push(d));
        file.on('end', () => {});
      });
      bb.on('field', (n, v) => {
        fields[n] = v;
      });
      bb.on('close', resolve);
      bb.on('error', reject);
      // @ts-ignore
      req.pipe(bb);
    });

    if (!fileParts.length) {
      return res.status(400).json({ success: false, error: 'file field is required' });
    }

    const buf = Buffer.concat(fileParts);
    console.log('upload: size', buf.length);

    const lower = (fileName || '').toLowerCase();
    const isPdf = lower.endsWith('.pdf') || buf.slice(0, 5).toString() === '%PDF-';

    let text = '';
    if (isPdf) {
      // Use direct function import; parse from Buffer only (no filesystem)
      const parsed = await (pdfParse as any)(buf);
      text = parsed?.text || '';
    } else if (lower.endsWith('.txt')) {
      text = buf.toString('utf-8');
    } else {
      // Fallback: try UTF-8 as text
      text = buf.toString('utf-8');
    }

    console.log('upload: text-len', text.length);

    text = clamp(text, 12000);
    if (!text || text.length < 50) {
      return res.status(400).json({ success: false, error: 'Insufficient text' });
    }

    const num_q = parseInt(fields['num_q'] || '5', 10);
    const difficulty = fields['difficulty'] || 'mixed';

    console.log('upload: gen', num_q, difficulty);

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = buildPrompt(text, num_q, difficulty);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: MCQ_SCHEMA as any,
      },
    });

    const raw = result.response.text();
    const items = JSON.parse(raw);
    const quiz = normalize(items);

    console.log('upload: done');

    return res.status(200).json({ success: true, quiz });
  } catch (e: any) {
    console.error('upload: error', e?.message || e);
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
