(function () {
  'use strict';

  const CONFIG = {
    API_BASE_URL: 'https://sask-trivia.nmorrison.workers.dev',
    CSS_URL: 'https://sask-trivia.nmorrison.workers.dev/sask-trivia.css',
    ROOT_SELECTOR: '#sask-trivia-root',
    MOUNT_SELECTOR: '.widget-area.widget-area-full',
    PAGE_PATH: '/sask-trivia',
    STORAGE_PREFIX: 'sasktoday_trivia'
  };

  const state = {
    root: null,
    question: null,
    selectedAnswer: null
  };

  const Storage = {
    key(name) {
      return `${CONFIG.STORAGE_PREFIX}_${name}`;
    },

    getPlayedVersion() {
      return Number(localStorage.getItem(this.key('played_version')) || 0);
    },

    getCurrentResult(version) {
      if (this.getPlayedVersion() !== Number(version)) return null;
      const raw = localStorage.getItem(this.key('current_result'));
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        localStorage.removeItem(this.key('current_result'));
        return null;
      }
    },

    getStats() {
      return {
        totalPlayed: Number(localStorage.getItem(this.key('total_played')) || 0),
        totalCorrect: Number(localStorage.getItem(this.key('total_correct')) || 0),
        currentStreak: Number(localStorage.getItem(this.key('current_streak')) || 0),
        bestStreak: Number(localStorage.getItem(this.key('best_streak')) || 0)
      };
    },

    saveResult(version, answer, result) {
      const stats = this.getStats();
      const nextStats = {
        totalPlayed: stats.totalPlayed + 1,
        totalCorrect: stats.totalCorrect + (result.correct ? 1 : 0),
        currentStreak: result.correct ? stats.currentStreak + 1 : 0,
        bestStreak: stats.bestStreak
      };
      nextStats.bestStreak = Math.max(nextStats.bestStreak, nextStats.currentStreak);

      localStorage.setItem(this.key('played_version'), String(version));
      localStorage.setItem(this.key('current_result'), JSON.stringify({
        answer,
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        message: result.message
      }));
      localStorage.setItem(this.key('total_played'), String(nextStats.totalPlayed));
      localStorage.setItem(this.key('total_correct'), String(nextStats.totalCorrect));
      localStorage.setItem(this.key('current_streak'), String(nextStats.currentStreak));
      localStorage.setItem(this.key('best_streak'), String(nextStats.bestStreak));
    }
  };

  function init() {
    if (CONFIG.PAGE_PATH && window.location.pathname !== CONFIG.PAGE_PATH) {
      return;
    }

    ensureStylesheet();

    state.root = document.querySelector(CONFIG.ROOT_SELECTOR);

    if (!state.root) {
      state.root = document.createElement('div');
      state.root.id = 'sask-trivia-root';
      const pageTarget = document.querySelector(CONFIG.MOUNT_SELECTOR)
        || document.querySelector('main article, article, main')
        || document.body;
      pageTarget.appendChild(state.root);
    }

    renderShell('<div class="sask-trivia__loading">Loading today\'s question...</div>');
    loadQuestion();
  }

  function ensureStylesheet() {
    if (!CONFIG.CSS_URL || document.querySelector(`link[href="${CONFIG.CSS_URL}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CONFIG.CSS_URL;
    document.head.appendChild(link);
  }

  async function loadQuestion() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/question`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Question request failed');

      state.question = await response.json();
      renderQuestion();
    } catch (error) {
      console.error('Sask Trivia failed to load:', error);
      renderShell('<div class="sask-trivia__error">Sorry, today\'s trivia question could not be loaded. Please refresh the page.</div>');
    }
  }

  function renderQuestion() {
    const result = Storage.getCurrentResult(state.question.version);
    const options = state.question.options.map((option, index) => {
      const classes = ['sask-trivia__option'];
      if (result && index === result.correctAnswer) classes.push('is-correct');
      if (result && index === result.answer && !result.correct) classes.push('is-incorrect');

      return `
        <button class="${classes.join(' ')}" type="button" data-answer="${index}" ${result ? 'disabled' : ''}>
          <strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(option)}
        </button>
      `;
    }).join('');

    const resultClass = result ? (result.correct ? 'is-correct' : 'is-incorrect') : '';
    const resultText = result ? escapeHtml(result.message) : '';

    renderShell(`
      <section class="sask-trivia__panel" aria-live="polite">
        <div class="sask-trivia__meta">Daily question #${state.question.version}</div>
        <h3 class="sask-trivia__question">${escapeHtml(state.question.question)}</h3>
        <div class="sask-trivia__options">${options}</div>
        <div class="sask-trivia__result ${result ? 'is-visible' : ''} ${resultClass}" id="saskTriviaResult">${resultText}</div>
      </section>
    `);

    if (!result) {
      state.root.querySelectorAll('[data-answer]').forEach((button) => {
        button.addEventListener('click', () => submitAnswer(Number(button.dataset.answer)));
      });
    }
  }

  async function submitAnswer(answer) {
    const buttons = Array.from(state.root.querySelectorAll('[data-answer]'));
    buttons.forEach((button) => {
      button.disabled = true;
    });

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, version: state.question.version })
      });
      const result = await response.json();

      Storage.saveResult(state.question.version, answer, result);
      renderQuestion();
    } catch (error) {
      console.error('Sask Trivia failed to check answer:', error);
      const result = state.root.querySelector('#saskTriviaResult');
      result.className = 'sask-trivia__result is-visible is-incorrect';
      result.textContent = 'Sorry, your answer could not be checked. Please try refreshing the page.';
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  function renderShell(content) {
    state.root.innerHTML = `
      <div class="sask-trivia">
        <div class="sask-trivia__eyebrow">SaskToday Trivia</div>
        <h2 class="sask-trivia__title">How Well Do You Know Saskatchewan?</h2>
        <p class="sask-trivia__intro">Answer one Saskatchewan trivia question each day and build your local knowledge streak.</p>
        ${content}
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
