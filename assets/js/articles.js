/* ============================================================
   Модуль загрузки статей из Табрики (Production-Ready)
   ============================================================ */

const ARTICLES_TOKEN = 'tab_xxBPQ6i9QSzUMBJt63LK2QMLcW-7paEQ7RHHfcUvx32vHnbv3C9fs8yW0-AzF_hH'; 
const DB_ID = '348'; 
const ARTICLES_TABLE_ID = '512'; 

const API_BASE = `https://api.tabrica.ru/public/v1/databases/${DB_ID}/tables/${ARTICLES_TABLE_ID}/records`;
const API_PARAMS = `?response_format=names&rich_text=html`;

// Красивая заглушка для пустого состояния
const emptyStateHTML = `
  <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-subtle); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
    <svg style="width: 48px; height: 48px; margin: 0 auto 16px; color: var(--ink-3);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
    <h3 style="font-size: 20px; color: var(--ink); margin-bottom: 8px;">Здесь пока тихо</h3>
    <p style="color: var(--ink-3); font-size: 15px;">Первые материалы уже готовятся к публикации.</p>
  </div>
`;

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
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const json = await res.json();
    
    // Защита: проверяем, что data — это массив. 
    // Если Табрика вернула объект с вложенным массивом, тоже обработаем.
    const articles = Array.isArray(json.data) ? json.data : (json.data?.records || []);

    if (articles.length === 0) {
      container.innerHTML = emptyStateHTML;
      return;
    }

    container.innerHTML = articles.map(article => {
      const color = article.cover_color || 'indigo';
      // Безопасное извлечение текста, если контента вдруг нет
      const rawContent = article.content || '';
      const plainText = rawContent.replace(/<[^>]*>?/gm, '');
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
    // В консоль пишем настоящую ошибку для разработчика
    console.error('Ошибка загрузки статей:', error);
    // А пользователю показываем красивую заглушку
    container.innerHTML = emptyStateHTML;
  }
}

// ==========================================
// 2. ЗАГРУЗКА ОДНОЙ СТАТЬИ (для article.html)
// ==========================================
async function loadSingleArticle() {
  const container = document.getElementById('article-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    container.innerHTML = '<div style="text-align: center; padding: 100px 20px;"><h1>Статья не найдена</h1><p style="color: var(--ink-3); margin-top: 16px;">Не указан идентификатор статьи.</p></div>';
    return;
  }

  try {
    const filter = `&where=${encodeURIComponent(`(slug,eq,${slug})`)}`;
    const res = await fetch(API_BASE + API_PARAMS + filter, {
      headers: { 'Authorization': `Bearer ${ARTICLES_TOKEN}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const json = await res.json();
    const articles = Array.isArray(json.data) ? json.data : (json.data?.records || []);
    const article = articles[0];

    if (!article) {
      container.innerHTML = '<div style="text-align: center; padding: 100px 20px;"><h1>Статья не найдена</h1><p style="color: var(--ink-3); margin-top: 16px;">Возможно, она была удалена или ссылка неверна.</p><a href="materials.html" class="btn btn-primary" style="margin-top: 24px;">Вернуться к материалам</a></div>';
      return;
    }

    document.title = `${article.title} — ArturExpert`;

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
        ${article.content || '<p>Текст статьи пока пуст.</p>'}
      </div>
    `;

  } catch (error) {
    console.error('Ошибка загрузки статьи:', error);
    container.innerHTML = '<div style="text-align: center; padding: 100px 20px;"><h1>Не удалось загрузить статью</h1><p style="color: var(--ink-3); margin-top: 16px;">Пожалуйста, попробуйте обновить страницу позже.</p><a href="materials.html" class="btn btn-primary" style="margin-top: 24px;">Вернуться к материалам</a></div>';
  }
}

// Запускаем нужную функцию в зависимости от страницы
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('articles-grid')) loadArticlesList();
  if (document.getElementById('article-container')) loadSingleArticle();
});
