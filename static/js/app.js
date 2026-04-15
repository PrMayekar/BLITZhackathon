/* ── FreshTrack App ──────────────────────────────────── */
'use strict';

const API = {
  base: '/api',
  token: null,
  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Token ${this.token}`;
    return h;
  },
  async req(method, path, body) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  },
  get: (p) => API.req('GET', p),
  post: (p, b) => API.req('POST', p, b),
  del: (p) => API.req('DELETE', p),
};

// MealDB direct browser fetch (no CORS issues)
const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

// ── State ──────────────────────────────────────────────
let state = {
  user: null,
  items: [],
  categories: [],
  recommendations: null,     // local DB recommendations
  liveResults: null,          // scored MealDB results
  liveStatus: 'idle',         // idle | loading | done | error
  currentFilter: 'all',
  currentRecipeTab: 'expiry_alert',
  sessionConsumed: 0,
  sessionWasted: 0,
  wastedItems: [],
};

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('ft_token');
  if (token) {
    API.token = token;
    try {
      state.user = await API.get('/auth/me/');
      showApp();
    } catch {
      localStorage.removeItem('ft_token');
      showAuth();
    }
  } else {
    showAuth();
  }
  const today = new Date().toISOString().split('T')[0];
  const pd = document.getElementById('item-purchase-date');
  if (pd) pd.value = today;
  bindEvents();
});

function showAuth() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('main-screen').classList.remove('active');
}

async function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  document.getElementById('greeting-time').textContent = greet;
  document.getElementById('greeting-name').textContent = state.user.first_name || state.user.username;
  document.getElementById('sidebar-username').textContent = state.user.username;
  document.getElementById('header-date').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  await loadCategories();
  await loadItems();
  await loadDashboard();
  loadLocalRecipes();
}

// ── Auth ───────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    });
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.remove('visible');
    try {
      const data = await API.post('/auth/login/', {
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value,
      });
      API.token = data.token;
      localStorage.setItem('ft_token', data.token);
      state.user = data.user;
      showApp();
    } catch (err) {
      errEl.textContent = err.error || 'Login failed. Check your credentials.';
      errEl.classList.add('visible');
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    errEl.classList.remove('visible');
    const p1 = document.getElementById('reg-password').value;
    const p2 = document.getElementById('reg-password2').value;
    if (p1 !== p2) { errEl.textContent = 'Passwords do not match.'; errEl.classList.add('visible'); return; }
    try {
      const data = await API.post('/auth/register/', {
        username: document.getElementById('reg-username').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        first_name: document.getElementById('reg-first').value.trim(),
        last_name: document.getElementById('reg-last').value.trim(),
        password: p1, password2: p2,
      });
      API.token = data.token;
      localStorage.setItem('ft_token', data.token);
      state.user = data.user;
      showApp();
      toast('Welcome to FreshTrack! 🌿', 'success');
    } catch (err) {
      const msgs = Object.values(err).flat().join(' ');
      errEl.textContent = msgs || 'Registration failed.';
      errEl.classList.add('visible');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await API.post('/auth/logout/', {}); } catch {}
    API.token = null;
    localStorage.removeItem('ft_token');
    state = { user:null, items:[], categories:[], recommendations:null, liveResults:null, liveStatus:'idle', currentFilter:'all', currentRecipeTab:'expiry_alert', sessionConsumed:0, sessionWasted:0, wastedItems:[] };
    showAuth();
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      renderPantry();
    });
  });
  document.getElementById('pantry-search').addEventListener('input', (e) => renderPantry(e.target.value));

  document.getElementById('item-packaged').addEventListener('change', (e) => {
    document.getElementById('expiry-group').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitAddItem();
  });

  document.querySelectorAll('.recipe-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.recipe-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentRecipeTab = tab.dataset.rtab;
      if (tab.dataset.rtab === 'live') {
        document.getElementById('live-source-bar').classList.remove('hidden');
        if (state.liveStatus === 'idle') {
          fetchAndScoreLiveRecipes();
        } else {
          renderLiveRecipes();
        }
      } else {
        document.getElementById('live-source-bar').classList.add('hidden');
        renderLocalRecipes();
      }
    });
  });

  document.getElementById('refresh-recipes').addEventListener('click', () => {
    if (state.currentRecipeTab === 'live') {
      state.liveStatus = 'idle';
      state.liveResults = null;
      fetchAndScoreLiveRecipes();
    } else {
      loadLocalRecipes();
    }
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('recipe-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

// ── View Switching ─────────────────────────────────────
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${viewId}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  if (viewId === 'pantry') renderPantry();
  if (viewId === 'tracker') renderTracker();
  if (viewId === 'add-item') {
    document.getElementById('item-purchase-date').value = new Date().toISOString().split('T')[0];
    loadRecentlyAdded();
  }
  if (viewId === 'nutrition' && typeof window.loadNutrition === 'function') {
    window.loadNutrition();
  }
}

// ── Data Loaders ───────────────────────────────────────
async function loadCategories() {
  try {
    const data = await API.get('/inventory/categories/');
    state.categories = data.results || data;
    const sel = document.getElementById('item-category');
    sel.innerHTML = '<option value="">Select category</option>';
    state.categories.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
    });
  } catch {}
}

async function loadItems() {
  try {
    const data = await API.get('/inventory/items/');
    state.items = data.results || data;
  } catch {}
}

async function loadDashboard() {
  try {
    const stats = await API.get('/inventory/items/dashboard_stats/');
    document.getElementById('stat-total').textContent = stats.total_items;
    document.getElementById('stat-expiring').textContent = stats.expiring_soon;
    document.getElementById('stat-fresh').textContent = stats.fresh;
    document.getElementById('stat-saved').textContent = stats.items_saved;
    const pct = stats.waste_reduction_rate;
    document.getElementById('waste-meter-fill').style.width = `${pct}%`;
    document.getElementById('waste-meter-pct').textContent = `${pct}%`;
    if (stats.expiring_soon > 0) {
      const badge = document.getElementById('expiry-badge');
      badge.style.display = 'flex';
      badge.textContent = stats.expiring_soon;
    }
    await loadExpiringList();
  } catch {}
}

async function loadExpiringList() {
  try {
    const data = await API.get('/inventory/items/?status=near_expiry');
    const items = (data.results || data).slice(0, 5);
    const el = document.getElementById('expiring-list');
    if (!items.length) { el.innerHTML = '<div class="empty-state-sm">No items expiring soon 🎉</div>'; return; }
    el.innerHTML = items.map(item => {
      const days = item.days_until_expiry;
      return `<div class="expiring-item">
        <div><div class="expiring-name">${escHtml(item.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${item.storage_location||''}</div></div>
        <span class="expiring-days ${days!==null&&days<=1?'danger':''}">
          ${days===0?'Today!':days===1?'Tomorrow':`${days}d left`}
        </span></div>`;
    }).join('');
  } catch {}
}

// ── LOCAL Recipes ──────────────────────────────────────
async function loadLocalRecipes() {
  const container = document.getElementById('recipes-container');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div> Analysing your pantry…</div>';
  try {
    state.recommendations = await API.get('/recipes/recommendations/');
    // Populate quick recipes on dashboard
    const general = state.recommendations.general || [];
    if (general.length) {
      document.getElementById('quick-recipes').innerHTML = general.slice(0, 4).map(r => quickRecipeHTML(r)).join('');
      document.querySelectorAll('.quick-recipe-item').forEach(el => {
        el.addEventListener('click', () => openLocalRecipeModal(el.dataset.id));
      });
    } else {
      document.getElementById('quick-recipes').innerHTML = '<div class="loading-sm">Add items to your pantry to get suggestions</div>';
    }
    renderLocalRecipes();
    updateContextBanner();
  } catch {
    container.innerHTML = '<div class="loading-state">⚠️ Add some items to your pantry to get recipe suggestions.</div>';
  }
}

function renderLocalRecipes() {
  const container = document.getElementById('recipes-container');
  if (!state.recommendations) return;
  const tab = state.currentRecipeTab;
  const recipes = state.recommendations[tab] || [];
  if (!recipes.length) {
    const msgs = {
      expiry_alert: 'No near-expiry items found. Add items with expiry dates to see urgent suggestions.',
      time_of_day: 'No recipes match your current time of day with your ingredients.',
      health: 'No health-tagged recipes match your pantry.',
      weekend_special: 'Weekend special recipes appear on Saturdays & Sundays!',
      general: 'Add items to your pantry and we\'ll find matching recipes.',
    };
    container.innerHTML = `<div class="empty-recipes"><div style="font-size:48px">🍽️</div><p>${msgs[tab]||'No recipes found.'}</p></div>`;
    return;
  }
  container.innerHTML = `<div class="recipes-grid">${recipes.map(r => localRecipeCardHTML(r)).join('')}</div>`;
  container.querySelectorAll('.recipe-card[data-source="local"]').forEach(card => {
    card.addEventListener('click', () => openLocalRecipeModal(card.dataset.id));
  });
}

// ── LIVE Recipes (MealDB) ──────────────────────────────
async function fetchAndScoreLiveRecipes() {
  const container = document.getElementById('recipes-container');
  const statusChip = document.getElementById('live-status-chip');
  const liveDot = document.getElementById('live-dot');

  state.liveStatus = 'loading';
  liveDot.classList.add('pulsing');
  statusChip.textContent = '';
  container.innerHTML = `<div class="loading-state live-loading">
    <div class="spinner"></div>
    <div class="loading-steps">
      <div class="lstep active" id="ls1">📦 Reading your pantry…</div>
      <div class="lstep" id="ls2">🌐 Fetching from TheMealDB…</div>
      <div class="lstep" id="ls3">🧠 Scoring & ranking…</div>
    </div>
  </div>`;

  try {
    // Step 1: get user's active ingredient names
    const ingredientNames = state.items
      .filter(i => !i.is_consumed && !i.is_wasted)
      .map(i => i.name.trim())
      .slice(0, 15); // max 15 ingredients to query

    if (!ingredientNames.length) {
      container.innerHTML = '<div class="empty-recipes"><div style="font-size:48px">🧺</div><p>Add items to your pantry first, then we can fetch live recipes!</p></div>';
      state.liveStatus = 'idle';
      liveDot.classList.remove('pulsing');
      return;
    }

    markStep('ls2');

    // Step 2: Fetch from MealDB for each ingredient in parallel (max 8 queries)
    const queryIngredients = ingredientNames.slice(0, 8);
    const fetchPromises = queryIngredients.map(name =>
      fetch(`${MEALDB}/filter.php?i=${encodeURIComponent(name)}`)
        .then(r => r.ok ? r.json() : { meals: null })
        .catch(() => ({ meals: null }))
    );

    const responses = await Promise.allSettled(fetchPromises);

    // Deduplicate by meal ID
    const mealMap = new Map();
    for (const res of responses) {
      if (res.status === 'fulfilled' && res.value.meals) {
        for (const meal of res.value.meals) {
          mealMap.set(meal.idMeal, meal);
        }
      }
    }

    if (mealMap.size === 0) {
      container.innerHTML = '<div class="empty-recipes"><div style="font-size:48px">🌐</div><p>No live recipes found. MealDB may not have recipes for your current ingredients. Try adding more common items like chicken, tomato, or pasta.</p></div>';
      state.liveStatus = 'error';
      liveDot.classList.remove('pulsing');
      statusChip.textContent = 'No results';
      statusChip.className = 'live-status-chip chip-error';
      return;
    }

    statusChip.textContent = `${mealMap.size} recipes found`;
    markStep('ls3');

    // Step 3: Fetch full details for top 30 meals (to get ingredients)
    const mealIds = [...mealMap.keys()].slice(0, 30);
    const detailPromises = mealIds.map(id =>
      fetch(`${MEALDB}/lookup.php?i=${id}`)
        .then(r => r.ok ? r.json() : { meals: null })
        .catch(() => ({ meals: null }))
    );

    const detailResponses = await Promise.allSettled(detailPromises);
    const fullMeals = [];
    for (const res of detailResponses) {
      if (res.status === 'fulfilled' && res.value.meals) {
        fullMeals.push(...res.value.meals);
      }
    }

    if (!fullMeals.length) {
      throw new Error('Could not fetch meal details');
    }

    // Step 4: Send to backend for scoring
    const scored = await API.post('/recipes/score-external/', { meals: fullMeals });
    state.liveResults = scored;
    state.liveStatus = 'done';
    liveDot.classList.remove('pulsing');
    liveDot.classList.add('live-active');

    const total = scored.total_scored || 0;
    const optimal = (scored.optimal || []).length;
    statusChip.textContent = `${total} scored · ${optimal} perfect matches`;
    statusChip.className = 'live-status-chip chip-success';

    renderLiveRecipes();

  } catch (err) {
    console.error('Live fetch error:', err);
    state.liveStatus = 'error';
    liveDot.classList.remove('pulsing');
    statusChip.textContent = 'Error';
    statusChip.className = 'live-status-chip chip-error';
    container.innerHTML = `<div class="empty-recipes">
      <div style="font-size:48px">⚠️</div>
      <p>Could not fetch live recipes. Check your connection and try again.</p>
      <button class="btn-primary" style="margin-top:16px" onclick="fetchAndScoreLiveRecipes()">Retry</button>
    </div>`;
  }
}

function markStep(stepId) {
  document.querySelectorAll('.lstep').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(stepId);
  if (el) el.classList.add('active');
}

function renderLiveRecipes() {
  const container = document.getElementById('recipes-container');
  if (!state.liveResults) return;

  const { all_results = [], optimal = [], partial = [], expiry_alert = [] } = state.liveResults;

  if (!all_results.length) {
    container.innerHTML = '<div class="empty-recipes"><div style="font-size:48px">🌐</div><p>No live recipes matched your pantry. Try adding more ingredients.</p></div>';
    return;
  }

  let html = '';

  // Banner row: stats
  html += `<div class="live-stats-row">
    <div class="live-stat"><span class="lsv">${all_results.length}</span><span class="lsl">Recipes Fetched</span></div>
    <div class="live-stat lsv-green"><span class="lsv">${optimal.length}</span><span class="lsl">Perfect Matches</span></div>
    <div class="live-stat lsv-yellow"><span class="lsv">${partial.length}</span><span class="lsl">Partial Matches</span></div>
    <div class="live-stat lsv-red"><span class="lsv">${expiry_alert.length}</span><span class="lsl">Use Expiring Items</span></div>
  </div>`;

  // Section: expiry alert
  if (expiry_alert.length) {
    html += sectionHeader('⚠️ Use These Now — Near-Expiry Matches', 'expiry');
    html += `<div class="recipes-grid">${expiry_alert.slice(0, 6).map(r => liveRecipeCardHTML(r)).join('')}</div>`;
  }

  // Section: optimal
  if (optimal.length) {
    html += sectionHeader('✅ Perfect Matches — You Have Everything', 'optimal');
    html += `<div class="recipes-grid">${optimal.slice(0, 8).map(r => liveRecipeCardHTML(r)).join('')}</div>`;
  }

  // Section: partial
  if (partial.length) {
    html += sectionHeader('🟡 Good Matches — Missing a Few Ingredients', 'partial');
    html += `<div class="recipes-grid">${partial.slice(0, 8).map(r => liveRecipeCardHTML(r)).join('')}</div>`;
  }

  container.innerHTML = html;

  // Bind modal opens
  container.querySelectorAll('.recipe-card[data-source="live"]').forEach(card => {
    card.addEventListener('click', () => openLiveRecipeModal(card.dataset.id));
  });
}

function sectionHeader(title, type) {
  const colors = { expiry: 'var(--warn)', optimal: 'var(--accent)', partial: 'var(--warn)' };
  return `<div class="section-header" style="border-left-color:${colors[type]||'var(--text2)'}">
    <h3>${title}</h3>
  </div>`;
}

// ── Recipe Card HTML ───────────────────────────────────
function localRecipeCardHTML(r) {
  const scorePct = Math.round(r.score * 100);
  const tags = (r.health_tags || []).slice(0, 3).map(t => `<span class="rc-tag">${healthTagLabel(t)}</span>`).join('');
  const expiryAlert = r.expiry_items_used?.length
    ? `<div class="rc-waste-insight">♻️ Saves: ${r.expiry_items_used.slice(0,2).map(escHtml).join(', ')}</div>` : '';
  const matched = (r.matched_ingredients || []).slice(0, 4);
  const missing = (r.missing_ingredients || []).slice(0, 3);
  return `<div class="recipe-card" data-source="local" data-id="${r.recipe_id}">
    <div class="rc-header">
      <div class="rc-emoji">${r.image_emoji}</div>
      <div class="rc-title-wrap">
        <div class="rc-title">${escHtml(r.title)}</div>
        <div class="rc-desc">${escHtml(r.description)}</div>
      </div>
      <span class="qr-badge badge-${r.category}">${capitalise(r.category)}</span>
    </div>
    <div class="rc-body">
      <div class="rc-meta">
        <span class="rc-meta-item">⏱ ${r.prep_time + r.cook_time} min</span>
        <span class="rc-meta-item">👤 ${r.servings}</span>
        <span class="rc-meta-item">📊 ${capitalise(r.difficulty)}</span>
        ${r.calories_per_serving ? `<span class="rc-meta-item">🔥 ${r.calories_per_serving} kcal</span>` : ''}
      </div>
      <div class="rc-score-row">
        <span style="font-size:11px;color:var(--text3)">Match</span>
        <div class="score-meter"><div class="score-fill ${r.category}" style="width:${scorePct}%"></div></div>
        <span class="score-pct">${scorePct}%</span>
      </div>
      ${tags ? `<div class="rc-tags">${tags}</div>` : ''}
      <div class="rc-ingredients">
        <div class="rc-ingr-label">Ingredients</div>
        <div class="rc-ingr-chips">
          ${matched.map(m => `<span class="ingr-chip matched">✓ ${escHtml(m.name||m)}</span>`).join('')}
          ${missing.map(m => `<span class="ingr-chip missing">✗ ${escHtml(m)}</span>`).join('')}
        </div>
      </div>
      ${expiryAlert}
    </div>
  </div>`;
}

function liveRecipeCardHTML(r) {
  const scorePct = Math.round(r.score * 100);
  const matched = (r.matched_ingredients || []).slice(0, 4);
  const missing = (r.missing_ingredients || []).slice(0, 3);
  const expiryAlert = r.expiry_items_used?.length
    ? `<div class="rc-waste-insight">♻️ Saves ${r.expiry_items_used.length} near-expiry item${r.expiry_items_used.length>1?'s':''}</div>` : '';
  const hasImg = r.image_url;
  return `<div class="recipe-card live-card" data-source="live" data-id="${r.recipe_id}">
    ${hasImg ? `<div class="rc-img-wrap"><img src="${escHtml(r.image_url)}/preview" alt="${escHtml(r.title)}" class="rc-thumb" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>` : ''}
    <div class="rc-header" style="${hasImg?'padding-top:10px':''}">
      <div class="rc-title-wrap">
        <div class="rc-title">${escHtml(r.title)}</div>
        <div class="rc-desc">${r.category_name} • ${r.area} cuisine</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="qr-badge badge-${r.category}">${capitalise(r.category)}</span>
        <span class="live-badge">🌐 Live</span>
      </div>
    </div>
    <div class="rc-body">
      <div class="rc-score-row">
        <span style="font-size:11px;color:var(--text3)">Match</span>
        <div class="score-meter"><div class="score-fill ${r.category}" style="width:${scorePct}%"></div></div>
        <span class="score-pct">${scorePct}%</span>
      </div>
      <div class="rc-meta">
        <span class="rc-meta-item">🧂 ${r.total_ingredients} ingredients</span>
        <span class="rc-meta-item">✅ ${matched.length} you have</span>
        <span class="rc-meta-item">🛒 ${missing.length} to buy</span>
      </div>
      <div class="rc-ingredients">
        <div class="rc-ingr-label">Your Pantry Matches</div>
        <div class="rc-ingr-chips">
          ${matched.map(m => `<span class="ingr-chip matched">✓ ${escHtml(m.name||m)}</span>`).join('')}
          ${missing.slice(0,2).map(m => `<span class="ingr-chip missing">✗ ${escHtml(typeof m==='object'?m.name:m)}</span>`).join('')}
          ${(r.matched_ingredients||[]).length + (r.missing_ingredients||[]).length > 6 ? `<span class="ingr-chip" style="background:var(--surface2);color:var(--text3)">+more</span>` : ''}
        </div>
      </div>
      ${expiryAlert}
      ${r.tags?.length ? `<div class="rc-tags">${r.tags.slice(0,3).map(t=>`<span class="rc-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function quickRecipeHTML(r) {
  return `<div class="quick-recipe-item" data-id="${r.recipe_id}">
    <span class="qr-emoji">${r.image_emoji}</span>
    <div class="qr-info">
      <div class="qr-title">${escHtml(r.title)}</div>
      <div class="qr-meta">${r.prep_time + r.cook_time} min · ${capitalise(r.difficulty)}</div>
    </div>
    <span class="qr-badge badge-${r.category}">${capitalise(r.category)}</span>
  </div>`;
}

function updateContextBanner() {
  if (!state.recommendations) return;
  const stats = state.recommendations.stats || {};
  const banner = document.getElementById('recipe-context-banner');
  if (stats.near_expiry_items > 0) {
    banner.textContent = `⚠️ You have ${stats.near_expiry_items} item${stats.near_expiry_items>1?'s':''} expiring soon — check "Use Now" for recipes to save them!`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// ── Modals ─────────────────────────────────────────────
function openLocalRecipeModal(recipeId) {
  if (!state.recommendations) return;
  const allRecs = [
    ...(state.recommendations.expiry_alert || []),
    ...(state.recommendations.time_of_day || []),
    ...(state.recommendations.health || []),
    ...(state.recommendations.weekend_special || []),
    ...(state.recommendations.general || []),
  ];
  const recipe = allRecs.find(r => String(r.recipe_id) === String(recipeId));
  if (!recipe) return;

  const matched = recipe.matched_ingredients || [];
  const missing = recipe.missing_ingredients || [];
  const ingrHTML = matched.map(m => `<div class="modal-ingr-row">
    <span class="modal-ingr-name">${escHtml(m.name)}</span>
    <span class="modal-ingr-qty">${m.user_item ? `Using: ${escHtml(m.user_item)}` : ''}</span>
    <span class="modal-ingr-status ${m.freshness==='near_expiry'?'near':'have'}">${m.freshness==='near_expiry'?'⚠️ Near Expiry':'✓ Have it'}</span>
  </div>`).join('') + missing.map(m => `<div class="modal-ingr-row">
    <span class="modal-ingr-name">${escHtml(m)}</span>
    <span></span><span class="modal-ingr-status need">✗ Need to buy</span>
  </div>`).join('');

  const healthTags = (recipe.health_tags||[]).map(t => `<span class="tag-health">${healthTagLabel(t)}</span>`).join(' ');
  const wasteInsight = recipe.expiry_items_used?.length
    ? `<div class="modal-waste-banner">♻️ <strong>Waste Saver!</strong> Uses ${recipe.expiry_items_used.join(', ')} — items near expiry.</div>` : '';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-recipe-header">
      <div class="modal-recipe-emoji">${recipe.image_emoji}</div>
      <div>
        <div class="modal-recipe-title">${escHtml(recipe.title)}</div>
        <div class="modal-recipe-desc">${escHtml(recipe.description)}</div>
        ${healthTags ? `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${healthTags}</div>` : ''}
      </div>
    </div>
    ${wasteInsight}
    <div class="modal-meta-grid">
      <div class="modal-meta-item"><div class="modal-meta-val">${recipe.prep_time}</div><div class="modal-meta-lbl">Prep (min)</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${recipe.cook_time}</div><div class="modal-meta-lbl">Cook (min)</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${recipe.servings}</div><div class="modal-meta-lbl">Servings</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${recipe.calories_per_serving||'—'}</div><div class="modal-meta-lbl">kcal</div></div>
    </div>
    <div class="modal-section">
      <div class="modal-score-row">
        <span class="modal-score-badge ${recipe.category}">${capitalise(recipe.category)} Match</span>
        <span class="modal-score-detail">${Math.round(recipe.score*100)}% match · ${matched.length} of ${matched.length+missing.length} ingredients in pantry</span>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Ingredients (${matched.length+missing.length})</div>
      <div class="modal-ingr-list">${ingrHTML}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Instructions</div>
      <div class="modal-instructions">${escHtml(recipe.instructions)}</div>
    </div>`;
  document.getElementById('recipe-modal').classList.remove('hidden');
}

function openLiveRecipeModal(recipeId) {
  if (!state.liveResults) return;
  const recipe = state.liveResults.all_results?.find(r => String(r.recipe_id) === String(recipeId));
  if (!recipe) return;

  const matched = recipe.matched_ingredients || [];
  const missing = recipe.missing_ingredients || [];
  const ingrHTML = matched.map(m => `<div class="modal-ingr-row">
    <span class="modal-ingr-name">${escHtml(m.name)}</span>
    <span class="modal-ingr-qty">${m.measure ? escHtml(m.measure) : ''}</span>
    <span class="modal-ingr-status ${m.freshness==='near_expiry'?'near':'have'}">${m.freshness==='near_expiry'?'⚠️ Near Expiry':'✓ In Pantry'}</span>
  </div>`).join('') + missing.map(m => `<div class="modal-ingr-row">
    <span class="modal-ingr-name">${escHtml(typeof m==='object'?m.name:m)}</span>
    <span class="modal-ingr-qty">${typeof m==='object'&&m.measure?escHtml(m.measure):''}</span>
    <span class="modal-ingr-status need">🛒 Buy</span>
  </div>`).join('');

  const wasteInsight = recipe.expiry_items_used?.length
    ? `<div class="modal-waste-banner">♻️ <strong>Waste Saver!</strong> This recipe uses ${recipe.expiry_items_used.join(', ')} which ${recipe.expiry_items_used.length>1?'are':'is'} near expiry.</div>` : '';

  const ytBtn = recipe.youtube
    ? `<a href="${escHtml(recipe.youtube)}" target="_blank" class="btn-primary" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;margin-bottom:12px">▶️ Watch on YouTube</a>` : '';

  const mealdbBtn = `<a href="${escHtml(recipe.mealdb_url)}" target="_blank" class="btn-secondary" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;margin-bottom:12px">🌐 View on MealDB</a>`;

  document.getElementById('modal-content').innerHTML = `
    ${recipe.image_url ? `<img src="${escHtml(recipe.image_url)}" alt="${escHtml(recipe.title)}" style="width:100%;border-radius:12px;margin-bottom:16px;max-height:200px;object-fit:cover" />` : ''}
    <div class="modal-recipe-header">
      <div style="flex:1">
        <div class="modal-recipe-title">${escHtml(recipe.title)}</div>
        <div class="modal-recipe-desc">${recipe.category_name} • ${recipe.area} Cuisine</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          <span class="live-badge" style="font-size:12px">🌐 TheMealDB</span>
          ${recipe.tags?.map(t=>`<span class="rc-tag">${escHtml(t)}</span>`).join('')||''}
        </div>
      </div>
    </div>
    ${wasteInsight}
    <div class="modal-meta-grid">
      <div class="modal-meta-item"><div class="modal-meta-val">${recipe.total_ingredients}</div><div class="modal-meta-lbl">Ingredients</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${matched.length}</div><div class="modal-meta-lbl">You Have</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${missing.length}</div><div class="modal-meta-lbl">Need to Buy</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${Math.round(recipe.score*100)}%</div><div class="modal-meta-lbl">Match Score</div></div>
    </div>
    <div class="modal-section">
      <div class="modal-score-row">
        <span class="modal-score-badge ${recipe.category}">${capitalise(recipe.category)}</span>
        <span class="modal-score-detail">Waste reduction score: ${Math.round(recipe.waste_reduction_score*100)}%</span>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">All Ingredients (${recipe.total_ingredients})</div>
      <div class="modal-ingr-list">${ingrHTML}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Instructions</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">${ytBtn}${mealdbBtn}</div>
      <div class="modal-instructions">${escHtml(recipe.full_instructions||recipe.instructions)}</div>
    </div>`;
  document.getElementById('recipe-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('recipe-modal').classList.add('hidden');
}

// ── Pantry ─────────────────────────────────────────────
function renderPantry(search = '') {
  const grid = document.getElementById('pantry-grid');
  let items = [...state.items];
  if (state.currentFilter !== 'all') {
    if (state.currentFilter === 'near_expiry') items = items.filter(i => i.freshness_status === 'near_expiry');
    else if (state.currentFilter === 'fresh') items = items.filter(i => i.freshness_status === 'fresh');
    else if (state.currentFilter === 'expired') items = items.filter(i => i.freshness_status === 'expired');
  }
  if (search) { const q = search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q)); }
  if (!items.length) {
    grid.innerHTML = `<div class="empty-pantry">
      <div class="ep-icon">🧺</div>
      <p>${state.items.length===0?'Your pantry is empty. Add some groceries!':'No items match your filter.'}</p>
      ${state.items.length===0?'<br><button class="btn-primary" onclick="switchView(\'add-item\')">+ Add Groceries</button>':''}
    </div>`;
    return;
  }
  grid.innerHTML = items.map(item => foodCardHTML(item)).join('');
  grid.querySelectorAll('.btn-consumed').forEach(btn => btn.addEventListener('click', () => markConsumed(btn.dataset.id)));
  grid.querySelectorAll('.btn-wasted').forEach(btn => btn.addEventListener('click', () => markWasted(btn.dataset.id)));
  grid.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteItem(btn.dataset.id)));
}

function foodCardHTML(item) {
  const status = item.freshness_status || 'unknown';
  const days = item.days_until_expiry;
  let expiryText = 'No expiry date';
  if (days !== null && days !== undefined) {
    if (days < 0) expiryText = `Expired ${Math.abs(days)}d ago`;
    else if (days === 0) expiryText = 'Expires TODAY';
    else if (days === 1) expiryText = 'Expires Tomorrow';
    else expiryText = `Expires in ${days} days`;
  }
  const statusLabels = { fresh: '✅ Fresh', near_expiry: '⚠️ Near Expiry', expired: '❌ Expired', unknown: '📦 No Date' };
  return `<div class="food-card status-${status}">
    <div class="card-top">
      <div class="card-name">${escHtml(item.name)}</div>
      <div class="card-cat">${item.category_icon||'🍽️'}</div>
    </div>
    <div class="freshness-chip ${status}">${statusLabels[status]||status}</div>
    <div class="card-details">
      <div class="card-detail">📦 <strong>${item.quantity_value} ${item.quantity_unit}</strong> · ${item.quantity}</div>
      <div class="card-detail">🏠 <strong>${capitalise(item.storage_location)}</strong></div>
      <div class="card-detail">📅 <strong>${expiryText}</strong></div>
      ${item.category_name?`<div class="card-detail">🏷️ ${escHtml(item.category_name)}</div>`:''}
    </div>
    <div class="card-actions">
      <button class="btn-consumed" data-id="${item.id}">✅ Used</button>
      <button class="btn-wasted" data-id="${item.id}">🗑️ Waste</button>
      <button class="btn-delete btn-icon" data-id="${item.id}">✕</button>
    </div>
  </div>`;
}

// ── Tracker ────────────────────────────────────────────
function renderTracker() {
  const container = document.getElementById('tracker-items');
  const active = state.items.filter(i => !i.is_consumed && !i.is_wasted);
  if (!active.length) { container.innerHTML = '<div class="loading-sm">No active items in pantry.</div>'; return; }
  container.innerHTML = active.map(item => {
    const days = item.days_until_expiry;
    const expiryLabel = days !== null ? (days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d left`) : '';
    return `<div class="tracker-item" id="ti-${item.id}">
      <span style="font-size:18px">${item.category_icon||'🍽️'}</span>
      <div class="tracker-item-name">${escHtml(item.name)}</div>
      ${expiryLabel ? `<span class="tracker-item-expiry" style="${days!==null&&days<=2?'color:var(--warn)':''}">${expiryLabel}</span>` : ''}
      <div class="tracker-item-actions">
        <button class="ti-btn used" onclick="trackerConsumed(${item.id},'${escHtml(item.name).replace(/'/g,"\\'")}')">✅</button>
        <button class="ti-btn waste" onclick="trackerWasted(${item.id},'${escHtml(item.name).replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
  updateTrackerStats();
}

async function trackerConsumed(id, name) {
  try {
    await API.post(`/inventory/items/${id}/mark_consumed/`, {});
    state.sessionConsumed++;
    await loadItems(); document.getElementById(`ti-${id}`)?.remove();
    updateTrackerStats(); toast(`✅ ${name} marked as used`, 'success');
    await loadDashboard();
  } catch { toast('Action failed', 'error'); }
}

async function trackerWasted(id, name) {
  try {
    await API.post(`/inventory/items/${id}/mark_wasted/`, {});
    state.sessionWasted++; state.wastedItems.push(name);
    await loadItems(); document.getElementById(`ti-${id}`)?.remove();
    updateTrackerStats(); toast(`🗑️ ${name} logged as waste`, 'info');
    await loadDashboard();
  } catch { toast('Action failed', 'error'); }
}

function updateTrackerStats() {
  document.getElementById('tstat-consumed').textContent = state.sessionConsumed;
  document.getElementById('tstat-wasted').textContent = state.sessionWasted;
  const total = state.sessionConsumed + state.sessionWasted;
  document.getElementById('tstat-rate').textContent = `${total ? Math.round((state.sessionConsumed/total)*100) : 100}%`;
  const wastedList = document.getElementById('wasted-list');
  wastedList.innerHTML = state.wastedItems.length
    ? state.wastedItems.map(n => `<div class="wasted-item">🗑️ ${escHtml(n)}</div>`).join('')
    : '<p class="empty-sm">No waste logged 🌿</p>';
}

// ── Add Item ───────────────────────────────────────────
async function submitAddItem() {
  const errEl = document.getElementById('add-item-error');
  errEl.classList.remove('visible');
  const name = document.getElementById('item-name').value.trim();
  if (!name) { errEl.textContent = 'Please enter an item name.'; errEl.classList.add('visible'); return; }
  const isPackaged = document.getElementById('item-packaged').checked;
  const expiry = document.getElementById('item-expiry').value;
  if (isPackaged && !expiry) { errEl.textContent = 'Please enter an expiry date for packaged items.'; errEl.classList.add('visible'); return; }
  const payload = {
    name,
    quantity: document.getElementById('item-quantity').value,
    quantity_value: parseFloat(document.getElementById('item-qty-value').value) || 1,
    quantity_unit: document.getElementById('item-qty-unit').value,
    purchase_date: document.getElementById('item-purchase-date').value,
    storage_location: document.getElementById('item-storage').value,
    is_packaged: isPackaged,
    notes: document.getElementById('item-notes').value.trim(),
  };
  const catVal = document.getElementById('item-category').value;
  if (catVal) payload.category = parseInt(catVal);
  if (isPackaged && expiry) payload.expiry_date = expiry;
  try {
    const item = await API.post('/inventory/items/', payload);
    state.items.unshift(item);
    toast(`✅ ${name} added to pantry`, 'success');
    document.getElementById('add-item-form').reset();
    document.getElementById('expiry-group').style.display = 'none';
    document.getElementById('item-purchase-date').value = new Date().toISOString().split('T')[0];
    loadRecentlyAdded();
    await loadDashboard();
    loadLocalRecipes();
    // Reset live recipes so they refresh with new ingredient
    state.liveStatus = 'idle'; state.liveResults = null;
  } catch (err) {
    const msgs = Object.values(err).flat().join(' ');
    errEl.textContent = msgs || 'Failed to add item.'; errEl.classList.add('visible');
  }
}

function loadRecentlyAdded() {
  const list = document.getElementById('recent-list');
  const recent = state.items.slice(0, 5);
  if (!recent.length) { list.innerHTML = '<p class="empty-sm">No items yet</p>'; return; }
  list.innerHTML = recent.map(i => `<div class="recent-item">
    <span>${i.category_icon||'🍽️'}</span>
    <span class="recent-item-name">${escHtml(i.name)}</span>
    <span class="recent-item-time">${i.quantity_value} ${i.quantity_unit}</span>
  </div>`).join('');
}

async function markConsumed(id) {
  const item = state.items.find(i => String(i.id) === String(id));
  try {
    await API.post(`/inventory/items/${id}/mark_consumed/`, {});
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderPantry(); toast(`✅ ${item?.name||'Item'} marked as used`, 'success');
    await loadDashboard(); loadLocalRecipes();
  } catch { toast('Action failed', 'error'); }
}

async function markWasted(id) {
  const item = state.items.find(i => String(i.id) === String(id));
  if (!confirm(`Mark "${item?.name}" as wasted?`)) return;
  try {
    await API.post(`/inventory/items/${id}/mark_wasted/`, {});
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderPantry(); toast(`🗑️ ${item?.name} logged as waste`, 'info');
    await loadDashboard();
  } catch { toast('Action failed', 'error'); }
}

async function deleteItem(id) {
  const item = state.items.find(i => String(i.id) === String(id));
  if (!confirm(`Delete "${item?.name}"?`)) return;
  try {
    await API.del(`/inventory/items/${id}/`);
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderPantry(); toast('Item deleted', 'info');
    await loadDashboard();
  } catch { toast('Delete failed', 'error'); }
}

// ── Helpers ────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalise(str) { if (!str) return ''; return str.charAt(0).toUpperCase()+str.slice(1).replace(/_/g,' '); }
function healthTagLabel(tag) {
  const labels = { high_protein:'💪 High Protein', low_carb:'🥗 Low Carb', vegan:'🌱 Vegan', vegetarian:'🥦 Vegetarian', heart_healthy:'❤️ Heart Healthy', immunity_boost:'🛡️ Immunity', weight_loss:'⚖️ Weight Loss', energy_boost:'⚡ Energy' };
  return labels[tag] || capitalise(tag);
}
function toast(message, type='info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
