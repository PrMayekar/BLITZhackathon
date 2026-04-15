/* ── FreshBot Chat Widget ────────────────────────────── */
'use strict';

(function () {

  // ── State ────────────────────────────────────────────
  const chatState = {
    open: false,
    messages: [],       // {role, content, time, source}
    loading: false,
  };

  // ── DOM refs (populated after DOMContentLoaded) ───────
  let bubble, panel, messagesEl, inputEl, sendBtn, typingEl,
      suggestionsScroll, clearBtn, closeBtn, pantryToggle, subtitleEl, badgeEl;

  // ── Init ─────────────────────────────────────────────
  function initChat() {
    bubble          = document.getElementById('chat-bubble');
    panel           = document.getElementById('chat-panel');
    messagesEl      = document.getElementById('chat-messages');
    inputEl         = document.getElementById('chat-input');
    sendBtn         = document.getElementById('chat-send-btn');
    typingEl        = document.getElementById('chat-typing');
    suggestionsScroll = document.getElementById('suggestions-scroll');
    clearBtn        = document.getElementById('chat-clear-btn');
    closeBtn        = document.getElementById('chat-close-btn');
    pantryToggle    = document.getElementById('pantry-toggle');
    subtitleEl      = document.getElementById('chat-subtitle');
    badgeEl         = document.getElementById('bubble-badge');

    if (!bubble) return; // not on auth screen

    bubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', closeChat);
    clearBtn.addEventListener('click', clearChat);
    sendBtn.addEventListener('click', sendMessage);

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    });

    // Load suggestions once user is logged in (poll for token)
    waitForToken().then(loadSuggestions);
  }

  function waitForToken(attempts = 0) {
    return new Promise((resolve) => {
      const check = () => {
        const token = localStorage.getItem('ft_token');
        if (token) { resolve(token); return; }
        if (attempts < 30) setTimeout(check, 500);
      };
      check();
    });
  }

  // ── Toggle ────────────────────────────────────────────
  function toggleChat() {
    chatState.open ? closeChat() : openChat();
  }

  function openChat() {
    chatState.open = true;
    panel.classList.remove('hidden');
    bubble.classList.add('open');
    hideBadge();
    inputEl.focus();
    scrollToBottom();
    if (chatState.messages.length === 0) loadSuggestions();
  }

  function closeChat() {
    chatState.open = false;
    panel.classList.add('hidden');
    bubble.classList.remove('open');
  }

  function clearChat() {
    chatState.messages = [];
    messagesEl.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-emoji">🌿</div>
        <div class="welcome-text">Hi! I'm <strong>FreshBot</strong> — your personal kitchen assistant.</div>
        <div class="welcome-sub">Ask me about nutrition, shelf life, cooking tips, food waste, or anything food-related!</div>
      </div>`;
    loadSuggestions();
  }

  function hideBadge() {
    badgeEl.classList.add('hidden');
  }

  // ── Suggestions ───────────────────────────────────────
  async function loadSuggestions() {
    const token = localStorage.getItem('ft_token');
    if (!token || !suggestionsScroll) return;
    try {
      const res = await fetch('/api/chatbot/suggestions/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      renderSuggestions(data.suggestions || []);
    } catch {}
  }

  function renderSuggestions(suggestions) {
    if (!suggestionsScroll) return;
    suggestionsScroll.innerHTML = suggestions.map(s =>
      `<button class="suggestion-chip" data-q="${escAttr(s)}">${escHtml(s)}</button>`
    ).join('');
    suggestionsScroll.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        inputEl.value = chip.dataset.q;
        sendMessage();
      });
    });
  }

  // ── Send ──────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || chatState.loading) return;

    const token = localStorage.getItem('ft_token');
    if (!token) {
      appendMessage('bot', '⚠️ Please log in to use FreshBot.');
      return;
    }

    // Clear welcome if first message
    const welcome = messagesEl.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    inputEl.value = '';
    inputEl.style.height = 'auto';

    // Add user message
    chatState.messages.push({ role: 'user', content: text });
    appendMessage('user', text);

    // Hide suggestions while loading
    document.getElementById('chat-suggestions').style.opacity = '0.4';

    chatState.loading = true;
    sendBtn.disabled = true;
    typingEl.classList.remove('hidden');
    subtitleEl.textContent = 'Thinking…';
    scrollToBottom();

    try {
      const res = await fetch('/api/chatbot/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          messages: chatState.messages.map(m => ({ role: m.role, content: m.content })),
          include_pantry: pantryToggle ? pantryToggle.checked : true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Something went wrong. Please try again.';
        appendErrorMessage(errMsg);
        // Pop the user message if failed
        chatState.messages.pop();
      } else {
        const reply = data.reply || 'Sorry, I could not generate a response.';
        const source = data.source || 'ai';
        chatState.messages.push({ role: 'assistant', content: reply });
        appendMessage('bot', reply, source);

        // Show badge if chat is closed
        if (!chatState.open) {
          badgeEl.classList.remove('hidden');
        }
      }
    } catch (err) {
      appendErrorMessage('Network error. Check your connection and try again.');
      chatState.messages.pop();
    } finally {
      chatState.loading = false;
      sendBtn.disabled = false;
      typingEl.classList.add('hidden');
      subtitleEl.textContent = 'Your kitchen assistant';
      document.getElementById('chat-suggestions').style.opacity = '1';
      scrollToBottom();
    }
  }

  // ── Render ────────────────────────────────────────────
  function appendMessage(role, content, source) {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    const avatar = role === 'bot'
      ? `<div class="msg-avatar">🌿</div>`
      : `<div class="msg-avatar">👤</div>`;

    const rendered = role === 'bot' ? renderMarkdown(content) : escHtml(content);
    const sourceBadge = (role === 'bot' && source === 'fallback')
      ? `<div class="msg-source-badge">📖 Knowledge Base</div>`
      : (role === 'bot' && source === 'ai')
      ? `<div class="msg-source-badge">✨ AI Powered</div>`
      : '';

    div.innerHTML = `
      ${avatar}
      <div>
        <div class="msg-bubble">${rendered}${sourceBadge}</div>
        <div class="msg-time">${now}</div>
      </div>`;

    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function appendErrorMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-error-msg';
    div.textContent = '⚠️ ' + text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ── Markdown renderer (lightweight) ──────────────────
  function renderMarkdown(text) {
    if (!text) return '';
    let html = escHtml(text);

    // Bold **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic _text_ or *text*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    // Inline code `text`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bullet lists (lines starting with - or •)
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    // Clean up double <br> around lists
    html = html.replace(/<br><ul>/g, '<ul>');
    html = html.replace(/<\/ul><br>/g, '</ul>');
    html = html.replace(/<br><li>/g, '<li>');

    return html;
  }

  // ── Helpers ───────────────────────────────────────────
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Start ─────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }

})();
