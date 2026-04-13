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
  put: (p, b) => API.req('PUT', p, b),
  patch: (p, b) => API.req('PATCH', p, b),
  del: (p) => API.req('DELETE', p),
};

// ── State ──────────────────────────────────────────────
let state = {
  user: null,
  items: [],
  categories: [],
  recommendations: null,
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

  // Set today's date as default for purchase date
  const today = new Date().toISOString().split('T')[0];
  const purchaseInput = document.getElementById('item-purchase-date');
  if (purchaseInput) purchaseInput.value = today;

  bindEvents();
});

function showAuth() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('main-screen').classList.remove('active');
}

async function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');

  // Set greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  document.getElementById('greeting-time').textContent = greet;
  document.getElementById('greeting-name').textContent = state.user.first_name || state.user.username;
  document.getElementById('sidebar-username').textContent = state.user.username;

  // Set date
  const now = new Date();
  document.getElementById('header-date').textContent =
    now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  await loadCategories();
  await loadItems();
  await loadDashboard();
  loadRecipes();
}

// ── Auth Events ────────────────────────────────────────
function bindEvents() {
  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    });
  });

  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.remove('visible');
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
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
    } finally {
      btn.disabled = false;
    }
  });

  // Register
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    errEl.classList.remove('visible');
    const p1 = document.getElementById('reg-password').value;
    const p2 = document.getElementById('reg-password2').value;
    if (p1 !== p2) {
      errEl.textContent = 'Passwords do not match.';
      errEl.classList.add('visible');
      return;
    }
    try {
      const data = await API.post('/auth/register/', {
        username: document.getElementById('reg-username').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        first_name: document.getElementById('reg-first').value.trim(),
        last_name: document.getElementById('reg-last').value.trim(),
        password: p1,
        password2: p2,
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

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await API.post('/auth/logout/', {}); } catch {}
    API.token = null;
    localStorage.removeItem('ft_token');
    state = { user: null, items: [], categories: [], recommendations: null, currentFilter: 'all', currentRecipeTab: 'expiry_alert', sessionConsumed: 0, sessionWasted: 0, wastedItems: [] };
    showAuth();
  });

  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Pantry filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      renderPantry();
    });
  });

  // Pantry search
  document.getElementById('pantry-search').addEventListener('input', (e) => {
    renderPantry(e.target.value);
  });

  // Add item form
  document.getElementById('item-packaged').addEventListener('change', (e) => {
    document.getElementById('expiry-group').style.display = e.target.checked ? 'flex' : 'none';
  });

  document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitAddItem();
  });

  // Recipes tabs
  document.querySelectorAll('.recipe-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.recipe-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentRecipeTab = tab.dataset.rtab;
      renderRecipes();
    });
  });

  // Refresh recipes
  document.getElementById('refresh-recipes').addEventListener('click', () => {
    loadRecipes();
  });

  // Modal close
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
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('item-purchase-date').value = today;
    loadRecentlyAdded();
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
  } catch (e) { console.error('Categories load failed', e); }
}

async function loadItems() {
  try {
    const data = await API.get('/inventory/items/');
    state.items = data.results || data;
  } catch (e) { console.error('Items load failed', e); }
}

async function loadDashboard() {
  try {
    const stats = await API.get('/inventory/items/dashboard_stats/');
    document.getElementById('stat-total').textContent = stats.total_items;
    document.getElementById('stat-expiring').textContent = stats.expiring_soon;
    document.getElementById('stat-fresh').textContent = stats.fresh;
    document.getElementById('stat-saved').textContent = stats.items_saved;

    // Waste meter
    const pct = stats.waste_reduction_rate;
    document.getElementById('waste-meter-fill').style.width = `${pct}%`;
    document.getElementById('waste-meter-pct').textContent = `${pct}%`;

    // Expiry badge
    if (stats.expiring_soon > 0) {
      const badge = document.getElementById('expiry-badge');
      badge.style.display = 'flex';
      badge.textContent = stats.expiring_soon;
    }

    // Expiring list
    await loadExpiringList();
  } catch (e) { console.error('Dashboard load failed', e); }
}

async function loadExpiringList() {
  try {
    const data = await API.get('/inventory/items/?status=near_expiry');
    const items = (data.results || data).slice(0, 5);
    const el = document.getElementById('expiring-list');
    if (!items.length) {
      el.innerHTML = '<div class="empty-state-sm">No items expiring soon 🎉</div>';
      return;
    }
    el.innerHTML = items.map(item => {
      const days = item.days_until_expiry;
      const isUrgent = days !== null && days <= 1;
      return `<div class="expiring-item">
        <div>
          <div class="expiring-name">${escHtml(item.name)}</div>
          <div style="font-size:11px;color:var(--text3)">${item.storage_location || ''}</div>
        </div>
        <span class="expiring-days ${isUrgent ? 'danger' : ''}">
          ${days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d left`}
        </span>
      </div>`;
    }).join('');
  } catch {}
}

async function loadRecipes() {
  const container = document.getElementById('recipes-container');
  container.innerHTML = '<div class="loading-state">🔍 Analysing your pantry…</div>';
  try {
    state.recommendations = await API.get('/recipes/recommendations/');
    document.getElementById('quick-recipes').innerHTML = '';
    const general = state.recommendations.general || [];
    if (general.length) {
      document.getElementById('quick-recipes').innerHTML = general.slice(0, 4).map(r => quickRecipeHTML(r)).join('');
      document.querySelectorAll('.quick-recipe-item').forEach(el => {
        el.addEventListener('click', () => openRecipeModal(el.dataset.id));
      });
    } else {
      document.getElementById('quick-recipes').innerHTML = '<div class="loading-sm">Add items to your pantry to get recipe suggestions</div>';
    }
    renderRecipes();
    updateContextBanner();
  } catch (e) {
    container.innerHTML = '<div class="loading-state">⚠️ Could not load recipes. Add some items to your pantry first.</div>';
  }
}

// ── Rendering ──────────────────────────────────────────
function renderPantry(search = '') {
  const grid = document.getElementById('pantry-grid');
  let items = [...state.items];

  // Filter
  if (state.currentFilter !== 'all') {
    if (state.currentFilter === 'near_expiry') items = items.filter(i => i.freshness_status === 'near_expiry');
    else if (state.currentFilter === 'fresh') items = items.filter(i => i.freshness_status === 'fresh');
    else if (state.currentFilter === 'expired') items = items.filter(i => i.freshness_status === 'expired');
  }

  // Search
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-pantry">
      <div class="ep-icon">🧺</div>
      <p>${state.items.length === 0 ? 'Your pantry is empty. Add some groceries!' : 'No items match your filter.'}</p>
      ${state.items.length === 0 ? '<br><button class="btn-primary" onclick="switchView(\'add-item\')">+ Add Groceries</button>' : ''}
    </div>`;
    return;
  }

  grid.innerHTML = items.map(item => foodCardHTML(item)).join('');

  // Bind card actions
  grid.querySelectorAll('.btn-consumed').forEach(btn => {
    btn.addEventListener('click', () => markConsumed(btn.dataset.id));
  });
  grid.querySelectorAll('.btn-wasted').forEach(btn => {
    btn.addEventListener('click', () => markWasted(btn.dataset.id));
  });
  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.id));
  });
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
      <div class="card-cat">${item.category_icon || '🍽️'}</div>
    </div>
    <div class="freshness-chip ${status}">${statusLabels[status] || status}</div>
    <div class="card-details">
      <div class="card-detail">📦 <strong>${item.quantity_value} ${item.quantity_unit}</strong> · ${item.quantity}</div>
      <div class="card-detail">🏠 <strong>${capitalise(item.storage_location)}</strong></div>
      <div class="card-detail">📅 <strong>${expiryText}</strong></div>
      ${item.category_name ? `<div class="card-detail">🏷️ ${escHtml(item.category_name)}</div>` : ''}
    </div>
    <div class="card-actions">
      <button class="btn-consumed" data-id="${item.id}">✅ Used</button>
      <button class="btn-wasted" data-id="${item.id}">🗑️ Waste</button>
      <button class="btn-delete btn-icon" data-id="${item.id}">✕</button>
    </div>
  </div>`;
}

function renderRecipes() {
  const container = document.getElementById('recipes-container');
  if (!state.recommendations) return;

  const tab = state.currentRecipeTab;
  const recipes = state.recommendations[tab] || [];

  if (!recipes.length) {
    const msgs = {
      expiry_alert: "No near-expiry items found, or no recipes match. Add items that are about to expire.",
      time_of_day: "No recipes match your current time of day with your ingredients.",
      health: "No health-tagged recipes match your pantry.",
      weekend_special: "No weekend specials match. Check back on the weekend!",
      general: "Add items to your pantry and we'll find matching recipes.",
    };
    container.innerHTML = `<div class="loading-state">🍽️ ${msgs[tab] || 'No recipes found.'}</div>`;
    return;
  }

  container.innerHTML = recipes.map(r => recipeCardHTML(r)).join('');
  container.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => openRecipeModal(card.dataset.id));
  });
}

function recipeCardHTML(r) {
  const scorePct = Math.round(r.score * 100);
  const tags = (r.health_tags || []).slice(0, 3).map(t =>
    `<span class="rc-tag">${healthTagLabel(t)}</span>`).join('');
  const expiryAlert = r.expiry_items_used?.length ?
    `<div class="rc-waste-insight">♻️ Uses ${r.expiry_items_used.length} near-expiry item${r.expiry_items_used.length > 1 ? 's' : ''}: ${r.expiry_items_used.slice(0, 2).map(escHtml).join(', ')}</div>` : '';
  const matched = (r.matched_ingredients || []).slice(0, 4);
  const missing = (r.missing_ingredients || []).slice(0, 3);
  return `<div class="recipe-card" data-id="${r.recipe_id}">
    <div class="rc-header">
      <div class="rc-emoji">${r.image_emoji}</div>
      <div class="rc-title-wrap">
        <div class="rc-title">${escHtml(r.title)}</div>
        <div class="rc-desc">${escHtml(r.description)}</div>
      </div>
      <span class="qr-badge badge-${r.category}">${r.category.charAt(0).toUpperCase() + r.category.slice(1)}</span>
    </div>
    <div class="rc-body">
      <div class="rc-meta">
        <span class="rc-meta-item">⏱ ${r.prep_time + r.cook_time} min</span>
        <span class="rc-meta-item">👤 ${r.servings} servings</span>
        <span class="rc-meta-item">📊 ${capitalise(r.difficulty)}</span>
        ${r.calories_per_serving ? `<span class="rc-meta-item">🔥 ${r.calories_per_serving} kcal</span>` : ''}
      </div>
      <div class="rc-score-row">
        <span class="score-label" style="font-size:11px;color:var(--text3)">Match</span>
        <div class="score-meter"><div class="score-fill ${r.category}" style="width:${scorePct}%"></div></div>
        <span class="score-pct">${scorePct}%</span>
      </div>
      ${tags ? `<div class="rc-tags">${tags}</div>` : ''}
      <div class="rc-ingredients">
        <div class="rc-ingr-label">Ingredients</div>
        <div class="rc-ingr-chips">
          ${matched.map(m => `<span class="ingr-chip matched">✓ ${escHtml(m.name || m)}</span>`).join('')}
          ${missing.map(m => `<span class="ingr-chip missing">✗ ${escHtml(m)}</span>`).join('')}
          ${(r.matched_ingredients || []).length + (r.missing_ingredients || []).length > 7 ? '<span class="ingr-chip" style="background:var(--surface2);color:var(--text3)">…more</span>' : ''}
        </div>
      </div>
      ${expiryAlert}
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
    banner.textContent = `⚠️ You have ${stats.near_expiry_items} item${stats.near_expiry_items > 1 ? 's' : ''} expiring soon — check "Use Now" for recipes that will save them!`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// ── Recipe Modal ───────────────────────────────────────
function openRecipeModal(recipeId) {
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
  const userItemMap = {};
  state.items.forEach(i => { userItemMap[i.name.toLowerCase()] = i; });

  const ingrHTML = matched.map(m => {
    const ui = m.user_item || '';
    const isNear = m.freshness === 'near_expiry';
    return `<div class="modal-ingr-row">
      <span class="modal-ingr-name">${escHtml(m.name)}</span>
      <span class="modal-ingr-qty" style="font-size:11px">${ui ? `Using: ${escHtml(ui)}` : ''}</span>
      <span class="modal-ingr-status ${isNear ? 'near' : 'have'}">${isNear ? '⚠️ Near Expiry' : '✓ Have it'}</span>
    </div>`;
  }).join('') + missing.map(m =>
    `<div class="modal-ingr-row">
      <span class="modal-ingr-name">${escHtml(m)}</span>
      <span class="modal-ingr-qty"></span>
      <span class="modal-ingr-status need">✗ Need to buy</span>
    </div>`
  ).join('');

  const healthTags = (recipe.health_tags || []).map(t =>
    `<span class="tag-health">${healthTagLabel(t)}</span>`).join(' ');

  const wasteInsight = recipe.expiry_items_used?.length ?
    `<div class="modal-waste-banner">♻️ <strong>Waste Saver!</strong> This recipe will use ${recipe.expiry_items_used.join(', ')} which ${recipe.expiry_items_used.length > 1 ? 'are' : 'is'} near expiry. Cook this today to avoid waste.</div>` : '';

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
      <div class="modal-meta-item"><div class="modal-meta-val">${recipe.calories_per_serving || '—'}</div><div class="modal-meta-lbl">kcal/serving</div></div>
    </div>
    <div class="modal-section">
      <div class="modal-score-row">
        <span class="modal-score-badge ${recipe.category}">${capitalise(recipe.category)} Match</span>
        <span class="modal-score-detail">
          ${Math.round(recipe.score * 100)}% ingredient match · 
          ${matched.length} of ${matched.length + missing.length} ingredients in your pantry
          ${recipe.waste_reduction_score > 0 ? ` · Waste reduction: ${Math.round(recipe.waste_reduction_score * 100)}%` : ''}
        </span>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Ingredients (${matched.length + missing.length})</div>
      <div class="modal-ingr-list">${ingrHTML}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Instructions</div>
      <div class="modal-instructions">${escHtml(recipe.instructions)}</div>
    </div>
  `;

  document.getElementById('recipe-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('recipe-modal').classList.add('hidden');
}

// ── Tracker ────────────────────────────────────────────
function renderTracker() {
  const container = document.getElementById('tracker-items');
  const active = state.items.filter(i => !i.is_consumed && !i.is_wasted);
  if (!active.length) {
    container.innerHTML = '<div class="loading-sm">No active items in pantry.</div>';
    return;
  }
  container.innerHTML = active.map(item => {
    const days = item.days_until_expiry;
    const expiryLabel = days !== null ? (days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d left`) : '';
    return `<div class="tracker-item" id="ti-${item.id}">
      <span style="font-size:18px">${item.category_icon || '🍽️'}</span>
      <div class="tracker-item-name">${escHtml(item.name)}</div>
      ${expiryLabel ? `<span class="tracker-item-expiry ${days !== null && days <= 2 ? 'style="color:var(--warn)"' : ''}">${expiryLabel}</span>` : ''}
      <div class="tracker-item-actions">
        <button class="ti-btn used" onclick="trackerConsumed(${item.id}, '${escHtml(item.name)}')">✅ Used</button>
        <button class="ti-btn waste" onclick="trackerWasted(${item.id}, '${escHtml(item.name)}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
  updateTrackerStats();
}

async function trackerConsumed(id, name) {
  try {
    await API.post(`/inventory/items/${id}/mark_consumed/`, {});
    state.sessionConsumed++;
    await loadItems();
    document.getElementById(`ti-${id}`)?.remove();
    updateTrackerStats();
    toast(`✅ ${name} marked as used`, 'success');
    await loadDashboard();
  } catch { toast('Action failed', 'error'); }
}

async function trackerWasted(id, name) {
  try {
    await API.post(`/inventory/items/${id}/mark_wasted/`, {});
    state.sessionWasted++;
    state.wastedItems.push(name);
    await loadItems();
    document.getElementById(`ti-${id}`)?.remove();
    updateTrackerStats();
    toast(`🗑️ ${name} logged as waste`, 'info');
    await loadDashboard();
  } catch { toast('Action failed', 'error'); }
}

function updateTrackerStats() {
  document.getElementById('tstat-consumed').textContent = state.sessionConsumed;
  document.getElementById('tstat-wasted').textContent = state.sessionWasted;
  const total = state.sessionConsumed + state.sessionWasted;
  const rate = total ? Math.round((state.sessionConsumed / total) * 100) : 100;
  document.getElementById('tstat-rate').textContent = `${rate}%`;
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
    loadRecipes();
  } catch (err) {
    const msgs = Object.values(err).flat().join(' ');
    errEl.textContent = msgs || 'Failed to add item.';
    errEl.classList.add('visible');
  }
}

function loadRecentlyAdded() {
  const list = document.getElementById('recent-list');
  const recent = state.items.slice(0, 5);
  if (!recent.length) { list.innerHTML = '<p class="empty-sm">No items yet</p>'; return; }
  list.innerHTML = recent.map(i => `
    <div class="recent-item">
      <span>${i.category_icon || '🍽️'}</span>
      <span class="recent-item-name">${escHtml(i.name)}</span>
      <span class="recent-item-time">${i.quantity_value} ${i.quantity_unit}</span>
    </div>`).join('');
}

// ── Pantry Actions ─────────────────────────────────────
async function markConsumed(id) {
  const item = state.items.find(i => String(i.id) === String(id));
  try {
    await API.post(`/inventory/items/${id}/mark_consumed/`, {});
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderPantry();
    toast(`✅ ${item?.name || 'Item'} marked as used`, 'success');
    await loadDashboard();
    loadRecipes();
  } catch { toast('Action failed', 'error'); }
}

async function markWasted(id) {
  const item = state.items.find(i => String(i.id) === String(id));
  if (!confirm(`Mark "${item?.name}" as wasted?`)) return;
  try {
    await API.post(`/inventory/items/${id}/mark_wasted/`, {});
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderPantry();
    toast(`🗑️ ${item?.name} logged as waste`, 'info');
    await loadDashboard();
  } catch { toast('Action failed', 'error'); }
}

async function deleteItem(id) {
  const item = state.items.find(i => String(i.id) === String(id));
  if (!confirm(`Delete "${item?.name}"?`)) return;
  try {
    await API.del(`/inventory/items/${id}/`);
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderPantry();
    toast('Item deleted', 'info');
    await loadDashboard();
  } catch { toast('Delete failed', 'error'); }
}

// ── Helpers ────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function healthTagLabel(tag) {
  const labels = {
    high_protein: '💪 High Protein',
    low_carb: '🥗 Low Carb',
    vegan: '🌱 Vegan',
    vegetarian: '🥦 Vegetarian',
    heart_healthy: '❤️ Heart Healthy',
    immunity_boost: '🛡️ Immunity',
    weight_loss: '⚖️ Weight Loss',
    energy_boost: '⚡ Energy',
  };
  return labels[tag] || capitalise(tag);
}

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
