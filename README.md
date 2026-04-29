# SaskToday Saskatchewan Trivia

This project creates a Saskatchewan trivia game for `sasktoday.ca/sask-trivia`.

The recommended setup is:

1. Cloudflare Worker serves the trivia API.
2. Villager page contains only a small root element, CSS, and a head script.
3. The correct answer stays on the Worker, not in the public page source.

## Files

- `src/index.js`: Cloudflare Worker API.
- `data/questions.json`: Trivia questions and answer indexes.
- `embed/sask-trivia.css`: CSS to paste into Villager's custom CSS field.
- `embed/sask-trivia.js`: Head script to paste into Villager after updating the Worker URL.
- `embed/villager-page-html.html`: The page body placeholder.

## Local Setup

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:8787/api/question` to confirm the API responds.

## Deploy To Cloudflare

1. Create a new GitHub repository and push this project.
2. In Cloudflare, create a Worker connected to that repository, or deploy from your machine:

```bash
npx wrangler login
npm run deploy
```

3. After deploy, Cloudflare will give you a URL like:

```text
https://sask-trivia.YOUR_SUBDOMAIN.workers.dev
```

4. Open `/api/health` on that URL. It should return:

```json
{"ok":true,"questionCount":30}
```

## Villager Setup

The Worker serves the CSS and JavaScript files from the `embed` folder, so Villager only needs short head tags.

Paste this into the page head scripts area, replacing the domain with your real Worker URL:

```html
<link rel="stylesheet" href="https://sask-trivia.YOUR_SUBDOMAIN.workers.dev/sask-trivia.css">
<script src="https://sask-trivia.YOUR_SUBDOMAIN.workers.dev/sask-trivia.js" defer></script>
```

You do not need to add body HTML. The script creates its own game container inside `.widget-area.widget-area-full` on `/sask-trivia`.

## How The Daily Question Works

The Worker uses `TRIVIA_START_DATE` from `wrangler.toml`.

```toml
TRIVIA_START_DATE = "2026-04-29"
```

Question 1 appears on that date, question 2 appears the next day, and so on. After all 30 questions, the game loops back to the first question.

To change the launch date, edit `wrangler.toml` before deploying.

## Adding Questions

Add new entries to `data/questions.json`. Each question needs:

```json
{
  "question": "Question text?",
  "options": ["First", "Second", "Third", "Fourth"],
  "correctAnswer": 1
}
```

`correctAnswer` is zero-based, so `0` is the first option, `1` is the second option, and so on.

Run this before deploying:

```bash
npm test
```
