import fs from 'node:fs/promises';

const raw = await fs.readFile(new URL('../data/questions.json', import.meta.url), 'utf8');
const questions = JSON.parse(raw);

if (!Array.isArray(questions) || questions.length === 0) {
  throw new Error('data/questions.json must contain at least one question.');
}

questions.forEach((question, index) => {
  const label = `Question ${index + 1}`;

  if (!question.question || typeof question.question !== 'string') {
    throw new Error(`${label} is missing question text.`);
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${label} must have at least two options.`);
  }

  if (!Number.isInteger(question.correctAnswer)) {
    throw new Error(`${label} must have an integer correctAnswer index.`);
  }

  if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
    throw new Error(`${label} correctAnswer is outside the options range.`);
  }
});

console.log(`Validated ${questions.length} Saskatchewan trivia questions.`);
