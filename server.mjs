import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { networkInterfaces } from 'node:os';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const HTML_FILE = 'muras_with_ai_improved.html';

function getLocalIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function json(res, status, payload) {
  send(res, status, JSON.stringify(payload), MIME['.json']);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function groqChat(systemPrompt, userMessage, maxTokens = 500) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('Groq error:', JSON.stringify(data));
    return null;
  }
  return data.choices?.[0]?.message?.content?.trim() || null;
}

function buildSystemPrompt(mode, language, lessonContext) {
  const langMap = { ru: 'Отвечай на русском языке.', ky: 'Кыргыз тилинде жооп бер.', en: 'Reply in English.' };
  const langInstruction = langMap[language] || langMap.ru;
  if (mode === 'quiz') {
    return [
      'Ты AI-помощник образовательной платформы о культуре и истории Кыргызстана.',
      langInstruction,
      'Составь 1 вопрос с 4 вариантами ответа строго по контексту урока.',
      'Верни только JSON вида {"question":"...","options":["...","...","...","..."],"correct":0}.',
      `Контекст урока: ${lessonContext || 'Контекст не передан.'}`
    ].join(' ');
  }
  if (mode === 'term') {
    return [
      'Ты AI-помощник образовательной платформы о культуре и истории Кыргызстана.',
      langInstruction,
      'Объясняй термины просто, дружелюбно и кратко, максимум 3 предложения.',
      `Контекст урока: ${lessonContext || 'Контекст не передан.'}`
    ].join(' ');
  }
  return [
    'Ты AI-помощник образовательной платформы о культуре и истории Кыргызстана.',
    langInstruction,
    'Отвечай кратко, полезно и по теме урока, максимум 4 предложения.',
    `Контекст урока: ${lessonContext || 'Контекст не передан.'}`
  ].join(' ');
}

function buildDemoReply(mode, message, lessonContext) {
  return { reply: 'Демо-режим: запусти сервер с GROQ_API_KEY для AI-ответов.' };
}

async function handleChat(req, res) {
  let payload;
  try { payload = await parseBody(req); } catch { return json(res, 400, { error: 'Некорректный JSON.' }); }

  const mode = payload.mode || 'chat';
  const message = String(payload.message || '').trim();
  const lessonContext = String(payload.lessonContext || '');
  const language = String(payload.language || 'ru');

  if (mode !== 'quiz' && !message) return json(res, 400, { error: 'Сообщение пустое.' });
  if (!GROQ_API_KEY) return json(res, 200, buildDemoReply(mode, message, lessonContext));

  try {
    const systemPrompt = buildSystemPrompt(mode, language, lessonContext);
    const userMsg = mode === 'quiz' ? 'Составь вопрос по этому уроку.' : message;
    const text = await groqChat(systemPrompt, userMsg, mode === 'quiz' ? 300 : 500);

    if (!text) return json(res, 200, buildDemoReply(mode, message, lessonContext));

    if (mode === 'quiz') {
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const quiz = JSON.parse(clean);
        if (!quiz.question || !Array.isArray(quiz.options) || typeof quiz.correct !== 'number') throw new Error();
        return json(res, 200, { quiz });
      } catch { return json(res, 200, buildDemoReply(mode, message, lessonContext)); }
    }
    return json(res, 200, { reply: text });
  } catch (err) {
    console.error('handleChat error:', err);
    return json(res, 200, buildDemoReply(mode, message, lessonContext));
  }
}

async function handlePlace(req, res) {
  let payload;
  try { payload = await parseBody(req); } catch { return json(res, 400, { error: 'Некорректный JSON.' }); }

  const message = String(payload.message || '').trim();
  const placeName = String(payload.placeName || '');
  const placeDesc = String(payload.placeDesc || '');

  if (!message) return json(res, 400, { error: 'Сообщение пустое.' });
  if (!GROQ_API_KEY) return json(res, 200, { reply: 'Нужен GROQ_API_KEY для AI-ответов.' });

  try {
    const systemPrompt = `Ты помощник платформы Мурас. Пользователь смотрит на место: ${placeName}. ${placeDesc} Отвечай кратко на языке вопроса.`;
    const text = await groqChat(systemPrompt, message, 400);
    return json(res, 200, { reply: text || 'Пустой ответ от AI.' });
  } catch (err) {
    console.error('handlePlace error:', err);
    return json(res, 200, { reply: 'Ошибка при обращении к AI.' });
  }
}

async function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? `/${HTML_FILE}` : pathname;
  const filePath = join(process.cwd(), safePath);
  try {
    const file = await readFile(filePath);
    send(res, 200, file, MIME[extname(filePath)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (req.method === 'POST' && url.pathname === '/api/chat') return handleChat(req, res);
  if (req.method === 'POST' && url.pathname === '/api/place') return handlePlace(req, res);
  if (req.method === 'GET') return serveStatic(url.pathname, res);
  send(res, 405, 'Method not allowed');
}).listen(PORT, HOST, () => {
  console.log(`Muras server running at http://localhost:${PORT}`);
  const localIp = getLocalIp();
  if (HOST === '0.0.0.0') console.log(`Open from phone on the same Wi-Fi: http://${localIp}:${PORT}`);
});