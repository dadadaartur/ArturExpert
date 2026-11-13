/* ============================================================
   Модуль загрузки статей из Табрики
   ============================================================ */

// ⚠️ ВАЖНО: Вставьте ваш токен (только для чтения) в строку ниже:
const ARTICLES_TOKEN = 'tab__tYFHBqzn7dOgtI9aG1P2a_p-vkcF1lV1BI0UTTHyfll-N_dvWpUMrkfxlyPiFNL'; 

// Эти ID я уже взял из вашей ссылки:
const DB_ID = '348'; 
const ARTICLES_TABLE_ID = '512'; 

const API_BASE = `https://api.tabrica.ru/public/v1/databases/${DB_ID}/tables/${ARTICLES_TABLE_ID}/records`;
const API_PARAMS = `?response_format=names&rich_text=html`; // Просим Табрику вернуть HTML-текст

// ==========================================
// 1. ЗАГРУЗКА СПИСКА СТАТЕЙ (для materials.html)
// ==========================================
async function loadArticlesList() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  try {
    const res = await fetch(API_BASE + API_PARAMS, {
      headers: { 'Authorization': `Bearer ${ARTICLES_TOKEN}` }
    });
    const json = await res.json();
    const articles = json.data || [];

    if (articles.length === 0) {
      container.innerHTML = '<p>Пока нет опубликованных статей.</p>';
      return;
    }

    container.innerHTML = articles.map(article => {
      const color = article.cover_color || 'indigo';
      // Очищаем HTML-теги из текста для краткого описания в карточке
      const plainText = article.content.replace(/<[^>]*>?/gm, '');
      const previewText = plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;

      return `
        <a href="article.html?slug=${article.slug}" class="material-card">
          <div class="material-cover cover-${color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <div class="material-body">
            <div style="display:flex; gap: 12px; align-items:center; margin-bottom: 8px;">
              <span class="material-tag">${article.category || 'Статья'}</span>
              <span style="font-size: 12px; color: var(--ink-3);">${article.read_time || '5 мин'}</span>
            </div>
            <h3>${article.title}</h3>
            <p>${previewText}</p>
          </div>
        </a>
      `;
    }).join('');

  } catch (error) {
    console.error('Ошибка загрузки статей:', error);
    container.innerHTML = '<p>Не удалось загрузить статьи. Проверьте консоль браузера (F12).</p>';
  }
}

// ==========================================
// 2. ЗАГРУЗКА ОДНОЙ СТАТЬИ (для article.html)
// ==========================================
async function loadSingleArticle() {
  const container = document.getElementById('article-container');
  if (!container) return;

  // Берем slug из URL (например, article.html?slug=smert-csat)
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    container.innerHTML = '<h1>Статья не найдена</h1><p>Не указан идентификатор статьи.</p>';
    return;
  }

  try {
    // Фильтруем записи по полю slug. 
    // Кодируем URL на случай, если в slug есть спецсимволы
    const filter = `&where=${encodeURIComponent(`(slug,eq,${slug})`)}`;
    const res = await fetch(API_BASE + API_PARAMS + filter, {
      headers: { 'Authorization': `Bearer ${ARTICLES_TOKEN}` }
    });
    const json = await res.json();
    const article = json.data && json.data[0];

    if (!article) {
      container.innerHTML = '<h1>Статья не найдена</h1><p>Возможно, она была удалена или ссылка неверна.</p>';
      return;
    }

    // Обновляем title страницы
    document.title = `${article.title} — ArturExpert`;

    // Рисуем страницу
    container.innerHTML = `
      <header class="article-header">
        <div class="article-meta">
          <span>${article.category || 'Статья'}</span>
          <span>•</span>
          <span>${article.read_time || '5 мин'}</span>
        </div>
        <h1 class="article-title">${article.title}</h1>
      </header>

      <div class="article-cover cover-${article.cover_color || 'indigo'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
      </div>

      <div class="article-content">
        ${article.content}
      </div>
    `;

  } catch (error) {
    console.error('Ошибка загрузки статьи:', error);
    container.innerHTML = '<h1>Ошибка</h1><p>Не удалось загрузить статью. Проверьте консоль.</p>';
  }
}

// Запускаем нужную функцию в зависимости от страницы
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('articles-grid')) loadArticlesList();
  if (document.getElementById('article-container')) loadSingleArticle();
});
