// lib/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCopy(prompt: string) {
  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful copywriting assistant for e-commerce businesses.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return chatCompletion.choices[0].message?.content || '';
}
