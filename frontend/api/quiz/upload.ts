// frontend/api/quiz/upload.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

// JSON schema for Gemini JSON mode
const MCQ_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    required: ['question', 'options', 'answer', 'explanation', 'difficulty', 'topic'],
    properties: {
      question: { type: 'string' },
      options: { type: 'array', items: { type: 'string' } },
      answer: { type: 'string', description: 'One of A,B, C, D' },
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
You are an expert educational content creator.

Create exactly ${num_q} multiple-choice questions from the notes below.

Rules:
- Each MCQ must have exactly 4 options labeled A, B, C, D in an "options" array.
- "answer" must be exactly one of "A","B","C","D".
- Provide a one-sentence "explanation" for why the answer is correct.
- Include "topic" and "difficulty" for each question.
- Avoid ambiguity; base questions strictly on the provided notes.

Return ONLY JSON that conforms to the schema (already included in the request).

Notes:
"""${notes}"""
`;
}

function normalize(items: any[]) {
  const out = [];
  for (const item of items) {
    const options = (item.options || []).map((x: any) => String(x)).slice(0, 4);
    while (options.length < 4) options.push('N/A');
    const letter = String(item.answer || 'A').trim().toUpperCase();
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const idx = map[letter] ?? 0;

    out.push({
      question: String(item.question || '').trim(),
      options,
      answerIndex: idx,
      answerLetter: 'ABCD'[idx],
      explanation: String(item.explanation || '').trim(),
      difficulty: String(item.difficulty || 'mixed').trim(),
      topic: String(item.topic || 'General').trim(),
    });
  }
  return out;
}

export const config = {
  api: { bodyParser: false }, // We will parse multipart stream manually
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not set' });

  try {
    const Busboy = (await import('busboy')).default;
    const bb = Busboy({ headers: req.headers });

    const fileBuffers: Buffer[] = [];
    let fileName = '';
    const fields: Record<string, string> = {};

    await new Promise<void>((resolve, reject) => {
      bb.on('file', (_name, file, info) => {
        fileName = info.filename || '';
        file.on('data', (d: Buffer) => fileBuffers.push(d));
        file.on('end', () => {});
      });
      bb.on('field', (name, val) => {
        fields[name] = val;
      });
      bb.on('error', reject);
      bb.on('close', () => resolve());
      // @ts-ignore
      req.pipe(bb);
    });

    if (fileBuffers.length === 0) {
      return res.status(400).json({ success: false, error: 'file field is required' });
    }

    const buf = Buffer.concat(fileBuffers);
    const lower = fileName.toLowerCase();
    let text = '';
    if (lower.endsWith('.pdf')) {
      const parsed = await pdfParse(buf);
      text = parsed.text || '';
    } else if (lower.endsWith('.txt')) {
      text = buf.toString('utf-8');
    } else {
      return res.status(400).json({ success: false, error: 'Only PDF or TXT supported' });
    }

    text = clamp(text, 12000);
    if (!text || text.length < 50) {
      return res.status(400).json({ success: false, error: 'File has insufficient text' });
    }

    const num_q = parseInt(fields['num_q'] || '5', 10);
    const difficulty = fields['difficulty'] || 'mixed';

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

    const raw = result.response.text(); // strict JSON string
    const items = JSON.parse(raw);
    const quiz = normalize(items);

    return res.status(200).json({ success: true, quiz });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
