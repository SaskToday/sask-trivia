import questions from '../data/questions.json';

const DEFAULT_START_DATE = '2026-04-29';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (env.ASSETS && (url.pathname === '/sask-trivia.css' || url.pathname === '/sask-trivia.js')) {
        return env.ASSETS.fetch(request);
      }

      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ ok: true, questionCount: questions.length }, corsHeaders);
      }

      if (url.pathname === '/api/question' && request.method === 'GET') {
        const dailyQuestion = getDailyQuestion(env);
        return json(publicQuestion(dailyQuestion), corsHeaders);
      }

      if (url.pathname === '/api/check-answer' && request.method === 'POST') {
        const body = await request.json();
        const result = checkAnswer(body, env);
        return json(result, corsHeaders);
      }

      return json({ error: 'Not found' }, corsHeaders, 404);
    } catch (error) {
      return json({ error: 'Server error', detail: error.message }, corsHeaders, 500);
    }
  }
};

function getCorsHeaders(request, env) {
  const allowedOrigins = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get('Origin');
  const allowOrigin = allowedOrigins.includes('*')
    ? '*'
    : allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    ...(allowOrigin === '*' ? {} : { 'Vary': 'Origin' })
  };
}

function getDailyQuestion(env) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions configured');
  }

  const startDate = parseUtcDate(env.TRIVIA_START_DATE || DEFAULT_START_DATE);
  const today = startOfUtcDay(new Date());
  const daysSinceStart = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / MS_PER_DAY));
  const version = daysSinceStart + 1;
  const index = daysSinceStart % questions.length;

  return { ...questions[index], version, totalQuestions: questions.length };
}

function checkAnswer(body, env) {
  const dailyQuestion = getDailyQuestion(env);
  const answer = Number(body?.answer);
  const version = Number(body?.version);

  if (!Number.isInteger(answer) || answer < 0 || answer >= dailyQuestion.options.length) {
    return {
      correct: false,
      correctAnswer: dailyQuestion.correctAnswer,
      message: 'Please choose one of the available answers.'
    };
  }

  if (version !== dailyQuestion.version) {
    return {
      correct: false,
      stale: true,
      correctAnswer: dailyQuestion.correctAnswer,
      message: 'That question has expired. Refresh the page for today\'s trivia.'
    };
  }

  const correct = answer === dailyQuestion.correctAnswer;

  return {
    correct,
    correctAnswer: dailyQuestion.correctAnswer,
    message: correct
      ? 'Correct! Nice Saskatchewan knowledge.'
      : `Not quite. The correct answer is ${dailyQuestion.options[dailyQuestion.correctAnswer]}.`
  };
}

function publicQuestion(question) {
  return {
    version: question.version,
    totalQuestions: question.totalQuestions,
    question: question.question,
    options: question.options
  };
}

function parseUtcDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${value}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function json(body, headers, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
