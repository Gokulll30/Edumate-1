// frontend/api/quiz/check.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { quiz, questionIndex, selectedIndex } = req.body || {};
    const item = quiz?.[Number(questionIndex)];
    if (!item) return res.status(400).json({ error: 'Invalid questionIndex' });

    const correctIndex = Number(item.answerIndex ?? 0);
    const correctLetter = String(item.answerLetter ?? 'A');
    const explanation = String(item.explanation ?? '');

    return res.status(200).json({
      correct: Number(selectedIndex) === correctIndex,
      correctIndex,
      correctLetter,
      explanation,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
