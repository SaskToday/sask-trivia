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

On the `sasktoday.ca/sask-trivia` page, add this HTML where the game should appear:

```html
<div id="sask-trivia-root"></div>
```

Paste the contents of `embed/sask-trivia.css` into the page CSS area.

In `embed/sask-trivia.js`, replace this placeholder:

```js
API_BASE_URL: 'https://sask-trivia.YOUR_SUBDOMAIN.workers.dev',
```

with the real Cloudflare Worker URL. Then paste the full JavaScript into the page head script area inside a `<script>` tag.

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
