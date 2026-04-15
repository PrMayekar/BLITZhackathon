/* ── FreshTrack — Scan & Nutrition Module ─────────────── */
'use strict';

// ─────────────────────────────────────────────────────────
//  RECEIPT SCANNER
// ─────────────────────────────────────────────────────────
(function initScanner() {
  let selectedFile = null;
  let scannedItems = [];
  let selectedIndices = new Set();

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    const dropZone    = document.getElementById('scan-drop-zone');
    const fileInput   = document.getElementById('scan-file-input');
    const browseBtn   = document.getElementById('scan-browse-btn');
    const preview     = document.getElementById('scan-preview');
    const previewImg  = document.getElementById('scan-preview-img');
    const clearBtn    = document.getElementById('scan-clear-btn');
    const submitBtn   = document.getElementById('scan-submit-btn');
    const status      = document.getElementById('scan-status');
    const resultsList = document.getElementById('scan-results-list');
    const resultsHdr  = document.getElementById('scan-results-header');
    const countChip   = document.getElementById('scan-count-chip');
    const actionsEl   = document.getElementById('scan-actions');
    const addAllBtn   = document.getElementById('scan-add-all-btn');
    const addSelBtn   = document.getElementById('scan-add-selected-btn');

    if (!dropZone) return;

    // Browse click
    browseBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => { if (e.target === dropZone || e.target.classList.contains('scan-drop-icon') || e.target.classList.contains('scan-drop-title') || e.target.classList.contains('scan-drop-sub')) fileInput.click(); });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) setFile(e.target.files[0]);
    });

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });

    clearBtn.addEventListener('click', clearScan);
    submitBtn.addEventListener('click', doScan);
    addAllBtn.addEventListener('click', () => addItemsToPantry('all'));
    addSelBtn.addEventListener('click', () => addItemsToPantry('selected'));

    function setFile(file) {
      if (file.size > 5 * 1024 * 1024) {
        showStatus('File too large. Max 5MB.', 'error'); return;
      }
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        dropZone.classList.add('hidden');
        preview.classList.remove('hidden');
        submitBtn.disabled = false;
        showStatus('Ready to scan. Click "Extract Items" to begin.', '');
      };
      reader.readAsDataURL(file);
    }

    function clearScan() {
      selectedFile = null;
      scannedItems = [];
      selectedIndices.clear();
      fileInput.value = '';
      previewImg.src = '';
      preview.classList.add('hidden');
      dropZone.classList.remove('hidden');
      submitBtn.disabled = true;
      resultsList.innerHTML = '';
      resultsHdr.classList.add('hidden');
      actionsEl.classList.add('hidden');
      showStatus('', '');
    }

    async function doScan() {
      if (!selectedFile) return;
      const token = localStorage.getItem('ft_token');
      if (!token) { showStatus('Please log in first.', 'error'); return; }

      submitBtn.disabled = true;
      showStatus('scanning', 'scanning');

      const formData = new FormData();
      formData.append('image', selectedFile);

      try {
        const res = await fetch('/api/chatbot/scan/', {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}` },
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          showStatus(data.error || 'Scan failed.', 'error');
          submitBtn.disabled = false;
          return;
        }

        // Demo mode (no API key)
        if (data.error === 'no_api_key') {
          scannedItems = data.demo_items || [];
          showStatus('⚠️ Demo mode — set ANTHROPIC_API_KEY for real scanning. Showing sample items.', '');
        } else {
          scannedItems = data.items || [];
          if (!scannedItems.length) {
            showStatus('No grocery items found. Try a clearer image of the receipt.', 'error');
            submitBtn.disabled = false;
            return;
          }
          showStatus(`✅ Found ${scannedItems.length} item${scannedItems.length > 1 ? 's' : ''}!`, '');
        }

        selectedIndices = new Set(scannedItems.map((_, i) => i));
        renderResults();
        submitBtn.disabled = false;
      } catch (err) {
        showStatus('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
      }
    }

    function renderResults() {
      resultsList.innerHTML = '';
      if (!scannedItems.length) {
        resultsList.innerHTML = '<div class="scan-no-items"><div class="no-icon">📄</div>Upload a receipt image to extract items.</div>';
        resultsHdr.classList.add('hidden');
        actionsEl.classList.add('hidden');
        return;
      }
      resultsHdr.classList.remove('hidden');
      countChip.textContent = `${scannedItems.length} items`;
      actionsEl.classList.remove('hidden');

      scannedItems.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = `scan-result-item ${selectedIndices.has(i) ? 'selected' : ''}`;
        div.innerHTML = `
          <span class="scan-result-check">${selectedIndices.has(i) ? '✅' : '⬜'}</span>
          <div class="scan-result-info">
            <div class="scan-result-name">${escHtml(item.name)}</div>
            <div class="scan-result-meta">${item.quantity} ${item.unit} · ${item.is_packaged ? '📦 Packaged' : '🥦 Fresh'}</div>
          </div>
          <span class="scan-result-cat">${escHtml(item.category_hint || 'General')}</span>`;
        div.addEventListener('click', () => {
          if (selectedIndices.has(i)) selectedIndices.delete(i);
          else selectedIndices.add(i);
          renderResults();
        });
        resultsList.appendChild(div);
      });
    }

    async function addItemsToPantry(mode) {
      const token = localStorage.getItem('ft_token');
      if (!token) return;
      const items = mode === 'all'
        ? scannedItems
        : scannedItems.filter((_, i) => selectedIndices.has(i));
      if (!items.length) { showStatus('No items selected.', 'error'); return; }

      addAllBtn.disabled = true;
      addSelBtn.disabled = true;
      showStatus(`Adding ${items.length} items…`, 'scanning');

      // Fetch categories once
      let categories = [];
      try {
        const cr = await fetch('/api/inventory/categories/', { headers: { 'Authorization': `Token ${token}` } });
        const cd = await cr.json();
        categories = cd.results || cd;
      } catch {}

      const catMap = {};
      categories.forEach(c => { catMap[c.name.toLowerCase()] = c.id; });

      let added = 0;
      for (const item of items) {
        const payload = {
          name: item.name,
          quantity: 'medium',
          quantity_value: parseFloat(item.quantity) || 1,
          quantity_unit: item.unit || 'pieces',
          is_packaged: item.is_packaged || false,
          storage_location: item.is_packaged ? 'pantry' : 'fridge',
          purchase_date: new Date().toISOString().split('T')[0],
        };
        const hint = (item.category_hint || '').toLowerCase();
        const catId = catMap[hint];
        if (catId) payload.category = catId;

        try {
          const r = await fetch('/api/inventory/items/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
            body: JSON.stringify(payload),
          });
          if (r.ok) added++;
        } catch {}
      }

      showStatus(`✅ Added ${added} of ${items.length} items to pantry!`, '');
      addAllBtn.disabled = false;
      addSelBtn.disabled = false;

      // Refresh main app state if available
      if (typeof loadItems === 'function') {
        await loadItems();
        await loadDashboard();
      }
      if (typeof toast === 'function') toast(`📷 Added ${added} items from receipt!`, 'success');
    }

    function showStatus(msg, type) {
      if (!status) return;
      if (type === 'scanning') {
        status.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Scanning receipt with AI…';
        status.className = 'scan-status scanning';
      } else {
        status.textContent = msg;
        status.className = `scan-status ${type || ''}`;
      }
    }
  });
})();


// ─────────────────────────────────────────────────────────
//  NUTRITION TRACKER
// ─────────────────────────────────────────────────────────
(function initNutrition() {
  let nutritionData = null;
  let currentTab = 'pantry';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    const refreshBtn = document.getElementById('refresh-nutrition');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', loadNutrition);

    document.querySelectorAll('.filter-btn[data-ntab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-ntab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.ntab;
        if (nutritionData) renderNutrition();
      });
    });

    // Auto-load when view becomes active (hook into switchView)
    const origSwitch = window.switchView;
    if (typeof origSwitch === 'function') {
      window.switchView = function(view) {
        origSwitch(view);
        if (view === 'nutrition' && !nutritionData) loadNutrition();
      };
    }
  });

  window.loadNutrition = async function () {
    const token = localStorage.getItem('ft_token');
    if (!token) return;

    // Show loading in macro cards
    ['m-calories','m-protein','m-carbs','m-fat','m-fiber'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '…';
    });

    try {
      const res = await fetch('/api/chatbot/nutrition/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      nutritionData = await res.json();
      renderNutrition();
    } catch (e) {
      console.error('Nutrition load failed', e);
    }
  };

  function renderNutrition() {
    if (!nutritionData) return;

    const tabMap = {
      pantry:   nutritionData.pantry_nutrition,
      consumed: nutritionData.consumed_nutrition,
      daily:    nutritionData.daily_average,
    };
    const breakdownMap = {
      pantry:   nutritionData.pantry_breakdown,
      consumed: nutritionData.consumed_breakdown,
      daily:    nutritionData.consumed_breakdown,
    };

    const data = tabMap[currentTab] || tabMap.pantry;
    const breakdown = breakdownMap[currentTab] || [];

    // Macro cards
    setVal('m-calories', data.calories);
    setVal('m-protein',  data.protein);
    setVal('m-carbs',    data.carbs);
    setVal('m-fat',      data.fat);
    setVal('m-fiber',    data.fiber);

    // Distribution bar
    const total = (data.protein * 4) + (data.carbs * 4) + (data.fat * 9);
    if (total > 0) {
      const pPct = Math.round((data.protein * 4 / total) * 100);
      const cPct = Math.round((data.carbs   * 4 / total) * 100);
      const fPct = 100 - pPct - cPct;
      setWidth('mdb-protein', pPct);
      setWidth('mdb-carbs',   cPct);
      setWidth('mdb-fat',     Math.max(0, fPct));
    }

    // Table
    const tbody = document.getElementById('nutrition-tbody');
    if (tbody) {
      if (!breakdown.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="nt-no-data" style="text-align:center;padding:20px">No nutrition data available for current items. Add items to your pantry to see breakdown.</td></tr>`;
      } else {
        tbody.innerHTML = breakdown.map(row => `
          <tr>
            <td class="nt-name">${escHtml(row.name)}</td>
            <td>${row.grams}g</td>
            <td class="nt-cal">${row.calories}</td>
            <td class="nt-prot">${row.protein}g</td>
            <td class="nt-carb">${row.carbs}g</td>
            <td class="nt-fat">${row.fat}g</td>
          </tr>`).join('');
      }
    }

    // Top nutrients
    const top = nutritionData.top_nutrients || {};
    renderTopList('top-protein-list', top.high_protein || [], 'g protein');
    renderTopList('top-carbs-list',   top.high_carb    || [], 'g carbs');
    renderTopList('top-cal-list',     top.high_calorie || [], 'kcal/100g');
  }

  function renderTopList(id, items, unit) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!items.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3)">No data yet</div>'; return; }
    el.innerHTML = items.map(([name, val]) => `
      <div class="top-nutrient-row">
        <span class="tnr-name">${escHtml(name)}</span>
        <span class="tnr-val">${val} <small style="font-weight:400;color:var(--text3)">${unit}</small></span>
      </div>`).join('');
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined ? val : '—';
  }
  function setWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(5, pct)}%`;
  }
})();

// Shared helper
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
