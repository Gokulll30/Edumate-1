// frontend/api/quiz/upload.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MCQ_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    required: ['question', 'options', 'answer', 'explanation', 'difficulty', 'topic'],
    properties: {
      question: { type: 'string' },
      options: { type: 'array', items: { type: 'string' } },
      answer: { type: 'string', description: 'A|B|C|D' },
      explanation: { type: 'string' },
      difficulty: { type: 'string' },
      topic: { type: 'string' }
    }
  }
};

function clamp(s: string, limit = 12000) {
  if (!s) return s;
  s = s.trim();
  return s.length > limit ? s.slice(0, limit) : s;
}

function normalize(items: any[]) {
  const out = [];
  for (const item of items) {
    const opts = (item.options || []).map((x: any) => String(x)).slice(0, 4);
    while (opts.length < 4) opts.push('N/A');
    const letter = String(item.answer || 'A').trim().toUpperCase();
    const idxMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const idx = idxMap[letter] ?? 0;
    out.push({
      question: String(item.question || '').trim(),
      options: opts,
      answerIndex: idx,
      answerLetter: 'ABCD'[idx],
      explanation: String(item.explanation || '').trim(),
      difficulty: String(item.difficulty || 'mixed').trim(),
      topic: String(item.topic || 'General').trim()
    });
  }
  return out;
}

function mcqPrompt(notes: string, num_q: number, difficulty: string) {
  return `
Create exactly ${num_q} multiple-choice questions from the notes below.

Rules:
- Each question must have exactly four options A, B, C, D.
- 'answer' must be one of "A","B","C","D".
- Provide a one-sentence 'explanation'.
- Include 'topic' and 'difficulty'.

Return ONLY JSON matching the provided schema.

Notes:
"""${notes}"""
`;
}

export const config = {
  api: {
    bodyParser: false // we’ll parse multipart manually
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    // parse multipart form manually
    const busboy = await import('busboy').then(m => m.default);
    const bb = busboy({ headers: req.headers });
    const buffers: Buffer[] = [];
    let fileName = '';
    const fields: Record<string, string> = {};

    await new Promise<void>((resolve, reject) => {
      bb.on('file', (_name, file, info) => {
        fileName = info.filename || '';
        file.on('data', (d: Buffer) => buffers.push(d));
        file.on('end', () => {});
      });
      bb.on('field', (name, val) => {
        fields[name] = val;
      });
      bb.on('close', () => resolve());
      bb.on('error', reject);
      // @ts-ignore
      req.pipe(bb);
    });

    const buf = Buffer.concat(buffers);
    let text = '';
    if (fileName.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdfParse(buf);
      text = parsed.text || '';
    } else if (fileName.toLowerCase().endsWith('.txt')) {
      text = buf.toString('utf-8');
    } else {
      return res.status(400).json({ success: false, error: 'Only PDF or TXT supported' });
    }

    text = clamp(text);
    const num_q = parseInt(fields['num_q'] || '5', 10);
    const difficulty = fields['difficulty'] || 'mixed';

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Request JSON mode via generationConfig
    const prompt = mcqPrompt(text, num_q, difficulty);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: MCQ_SCHEMA as any
      }
    });

    const raw = result.response.text();
    const items = JSON.parse(raw);
    const quiz = normalize(items);

    return res.status(200).json({ success: true, quiz });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
}
