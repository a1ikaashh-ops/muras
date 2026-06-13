# Muras AI Chat

Запуск OpenAI:

```bash
OPENAI_API_KEY=AIzaSyAEPuSZ7iViX5_PAa98WA0-40LJgtc2zAE node server.mjs
```

Запуск Gemini (Google Generative AI):

```bash
GOOGLE_API_KEY=AIzaSyAEPuSZ7iViX5_PAa98WA0-40LJgtc2zAE USE_GEMINI=1 node server.mjs
```

Если ты хочешь использовать Gemini по умолчанию, без OpenAI, достаточно:

```bash
GOOGLE_API_KEY=AIzaSyAEPuSZ7iViX5_PAa98WA0-40LJgtc2zAE node server.mjs
```

После запуска открой:

```text
http://127.0.0.1:3000/muras_with_ai_improved.html
```

Что важно:

- AI-чат теперь работает через локальный сервер `/api/chat`
- ключ хранится на сервере, а не в HTML
- без `OPENAI_API_KEY` сайт откроется, но AI напишет понятную ошибку
- по умолчанию сервер использует модель `gpt-5.4-mini`

Опционально:

```bash
OPENAI_API_KEY=твой_ключ OPENAI_MODEL=gpt-5.4 node server.mjs
```
# muras
