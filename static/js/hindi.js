/* ── FreshTrack — Hindi Translation (हिंदी अनुवाद) ──────── */
'use strict';

const HINDI = {
  /* ── Auth ── */
  'Sign In':            'साइन इन करें',
  'Create Account':     'अकाउंट बनाएं',
  'Username':           'यूज़रनेम',
  'Password':           'पासवर्ड',
  'First Name':         'पहला नाम',
  'Last Name':          'अंतिम नाम',
  'Email':              'ईमेल',
  'Confirm Password':   'पासवर्ड दोहराएं',

  /* ── Nav ── */
  'Dashboard':          'डैशबोर्ड',
  'My Pantry':          'मेरी पेंट्री',
  'Add Groceries':      'किराना जोड़ें',
  'Recipe Ideas':       'रेसिपी आइडिया',
  'Daily Tracker':      'दैनिक ट्रैकर',
  'Scan Receipt':       'बिल स्कैन करें',
  'Nutrition':          'पोषण',
  'Sign Out':           'साइन आउट',

  /* ── Dashboard ── */
  'Total Items':        'कुल आइटम',
  'Expiring Soon':      'जल्द समाप्त',
  'Fresh Items':        'ताज़े आइटम',
  'Items Saved':        'बचाए गए आइटम',
  'Expiring Soon':      'जल्द एक्सपायर',
  '⚠️ Expiring Soon':  '⚠️ जल्द एक्सपायर',
  '🍽️ Quick Recipe Picks': '🍽️ जल्दी रेसिपी',
  'View All':           'सब देखें',
  'All Recipes':        'सभी रेसिपी',
  '🌍 Your Waste Reduction Score': '🌍 आपका वेस्ट रिडक्शन स्कोर',
  'of your food has been used, not wasted': 'आपका खाना बर्बाद नहीं हुआ',

  /* ── Pantry ── */
  'My Pantry 🧺':       'मेरी पेंट्री 🧺',
  'Track and manage your food inventory': 'अपने खाने का रिकॉर्ड रखें',
  '+ Add Item':         '+ आइटम जोड़ें',
  'All Items':          'सभी आइटम',
  '⚠️ Near Expiry':    '⚠️ जल्द एक्सपायर',
  '✅ Fresh':           '✅ ताज़ा',
  '❌ Expired':         '❌ एक्सपायर',
  '✅ Used':            '✅ उपयोग किया',
  '🗑️ Waste':          '🗑️ बर्बाद',
  '✅ Fresh':           '✅ ताज़ा',
  '⚠️ Near Expiry':    '⚠️ जल्द एक्सपायर',
  '❌ Expired':         '❌ एक्सपायर',
  '📦 No Date':         '📦 तारीख नहीं',
  'No expiry date':     'एक्सपायरी नहीं',
  'Expires TODAY':      'आज एक्सपायर',
  'Expires Tomorrow':   'कल एक्सपायर',

  /* ── Add Item ── */
  'Add Groceries ➕':    'किराना जोड़ें ➕',
  'Log new food items and set expiry dates': 'नए आइटम दर्ज करें और एक्सपायरी तारीख सेट करें',
  'Item Details':       'आइटम विवरण',
  'Item Name *':        'आइटम का नाम *',
  'Category':           'श्रेणी',
  'Quantity Amount':    'मात्रा',
  'Unit':               'इकाई',
  'Quantity Level':     'मात्रा स्तर',
  'Storage & Dates':    'भंडारण और तारीखें',
  'Purchase Date':      'खरीद तारीख',
  'Storage Location':   'भंडारण स्थान',
  '🧊 Refrigerator':   '🧊 फ्रिज',
  '❄️ Freezer':        '❄️ फ्रीज़र',
  '🚪 Pantry':         '🚪 पेंट्री',
  '🍽️ Counter':        '🍽️ काउंटर',
  'Packaged item (has expiry date on label)': 'पैकेज्ड आइटम (लेबल पर एक्सपायरी है)',
  'Expiry Date *':      'एक्सपायरी तारीख *',
  'Notes (Optional)':   'नोट्स (वैकल्पिक)',
  '✅ Add to Pantry':   '✅ पेंट्री में जोड़ें',
  'Recently Added':     'हाल ही में जोड़े',
  '💡 Tips for Less Waste': '💡 कम बर्बादी के टिप्स',

  /* ── Recipes ── */
  'Recipe Ideas 🍽️':    'रेसिपी आइडिया 🍽️',
  'Smart suggestions from your pantry + live recipes from the web': 'आपकी पेंट्री और इंटरनेट से स्मार्ट सुझाव',
  '⚠️ Use Now':         '⚠️ अभी बनाएं',
  '🕐 Right Now':       '🕐 अभी के लिए',
  '💪 Healthy':         '💪 स्वास्थ्यवर्धक',
  '🎉 Weekend':         '🎉 वीकेंड स्पेशल',
  '📋 All Matches':     '📋 सभी मैच',
  '🌐 Live Web':        '🌐 लाइव वेब',
  '🔄 Refresh':         '🔄 रिफ्रेश करें',
  'Optimal':            'बेहतरीन',
  'Partial':            'आंशिक',
  'Low':                'कम',
  'Match':              'मेल',
  'Ingredients':        'सामग्री',
  'Instructions':       'निर्देश',
  'Servings':           'परोसे',
  'Prep (min)':         'तैयारी (मिनट)',
  'Cook (min)':         'पकाने का समय',

  /* ── Tracker ── */
  'Daily Tracker 📅':   'दैनिक ट्रैकर 📅',
  'Log what you use and what you waste': 'उपयोग और बर्बादी का रिकॉर्ड रखें',
  'Mark Items as Used ✅': 'उपयोग किए गए आइटम चिह्नित करें ✅',
  'Select items you\'ve consumed today': 'आज उपयोग किए गए आइटम चुनें',
  'Waste Log 🗑️':       'बर्बादी लॉग 🗑️',
  'Items marked as wasted this session': 'इस सत्र में बर्बाद हुए आइटम',
  'Used Today':         'आज उपयोग',
  'Wasted':             'बर्बाद',
  'Save Rate':          'बचत दर',

  /* ── Scan Receipt ── */
  'Scan Receipt 📷':    'बिल स्कैन करें 📷',
  'Upload a grocery bill or receipt to auto-add items': 'किराना बिल अपलोड करें, आइटम अपने आप जुड़ जाएंगे',
  'Drop your receipt here': 'यहाँ बिल डालें',
  'or click to browse · JPG, PNG, WebP · Max 5MB': 'या क्लिक करें · JPG, PNG, WebP · अधिकतम 5MB',
  'Browse File':        'फ़ाइल चुनें',
  '✕ Clear':            '✕ हटाएं',
  '🔍 Extract Items from Receipt': '🔍 बिल से आइटम निकालें',
  'Items Found':        'मिले आइटम',
  '✅ Add All to Pantry':'✅ सभी पेंट्री में जोड़ें',
  'Add Selected':       'चुने हुए जोड़ें',

  /* ── Nutrition ── */
  'Nutrition Tracker 🔬': 'पोषण ट्रैकर 🔬',
  'Nutritional breakdown of your pantry and consumption': 'आपकी पेंट्री और उपभोग का पोषण विश्लेषण',
  '📦 In My Pantry':    '📦 मेरी पेंट्री में',
  '✅ Consumed (7 days)':'✅ उपभोग (7 दिन)',
  '📅 Daily Average':   '📅 दैनिक औसत',
  'Calories':           'कैलोरी',
  'Protein':            'प्रोटीन',
  'Carbohydrates':      'कार्बोहाइड्रेट',
  'Fat':                'वसा',
  'Fiber':              'फाइबर',
  'Macro Distribution': 'मैक्रो वितरण',
  'Carbs':              'कार्ब्स',
  'Per Item Breakdown': 'प्रति आइटम विवरण',
  'Item':               'आइटम',
  'Est. Grams':         'अनुमानित ग्राम',
  'Highest Protein':    'सर्वाधिक प्रोटीन',
  'Highest Carbs':      'सर्वाधिक कार्ब्स',
  'Highest Calories':   'सर्वाधिक कैलोरी',

  /* ── Chatbot ── */
  'Your kitchen assistant': 'आपका रसोई सहायक',
  'Ask about nutrition, shelf life, recipes...': 'पोषण, शेल्फ लाइफ, रेसिपी के बारे में पूछें...',
  '🧺 Use my pantry':   '🧺 मेरी पेंट्री उपयोग करें',

  /* ── Common ── */
  'Loading…':           'लोड हो रहा है…',
  'No items expiring soon 🎉': 'जल्दी कोई आइटम एक्सपायर नहीं होगा 🎉',
  'Your pantry is empty. Add some groceries!': 'पेंट्री खाली है। किराना जोड़ें!',
  'Today!':             'आज!',
  'Tomorrow':           'कल',
  'Medium':             'मध्यम',
  'Low':                'कम',
  'High':               'अधिक',
  'pieces':             'टुकड़े',
  'grams':              'ग्राम',
  'kg':                 'किलो',
  'ml':                 'मिलीलीटर',
  'litres':             'लीटर',
  'cups':               'कप',
  'packets':            'पैकेट',
  'bunch':              'गुच्छा',
  'Refrigerator':       'फ्रिज',
  'Freezer':            'फ्रीज़र',
  'Pantry':             'पेंट्री',
  'Counter':            'काउंटर',
};

// ── Translation engine ────────────────────────────────────
let isHindi = false;

// Store original text for all translatable elements
const originalTexts = new Map();

function collectOriginals(root) {
  root = root || document;
  // Text nodes in elements with data-i18n or matching known strings
  root.querySelectorAll('[data-i18n]').forEach(el => {
    if (!originalTexts.has(el)) {
      originalTexts.set(el, el.textContent.trim());
    }
  });
  // All elements whose textContent is a known key
  root.querySelectorAll('button, label, span, h2, h3, h4, p, th, .stat-label, .nav-label, .view-title, .view-subtitle, .panel-h3, .panel-sub, .form-section-title, .toggle-text').forEach(el => {
    const text = el.textContent.trim();
    if (HINDI[text] && !originalTexts.has(el)) {
      originalTexts.set(el, text);
    }
  });
}

function translateEl(el) {
  const orig = originalTexts.get(el);
  if (!orig) return;
  const translation = HINDI[orig];
  if (translation) {
    el.textContent = isHindi ? translation : orig;
  }
}

function applyTranslation(root) {
  root = root || document;
  collectOriginals(root);
  originalTexts.forEach((orig, el) => {
    if (root === document || root.contains(el)) {
      translateEl(el);
    }
  });

  // Translate placeholders
  const placeholderMap = {
    'your_username':                     isHindi ? 'यूज़रनेम' : 'your_username',
    'Ask about nutrition, shelf life, recipes...': isHindi ? 'पोषण, शेल्फ लाइफ के बारे में पूछें...' : 'Ask about nutrition, shelf life, recipes...',
  };
  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
    if (!el.dataset.origPlaceholder) el.dataset.origPlaceholder = el.placeholder;
    const orig = el.dataset.origPlaceholder;
    const t = HINDI[orig];
    el.placeholder = (isHindi && t) ? t : orig;
  });

  // Page title
  document.title = isHindi ? 'फ्रेशट्रैक — कम बर्बादी, स्मार्ट खाना' : 'FreshTrack — Reduce Waste, Eat Smart';

  // Brand tagline
  const tagline = document.querySelector('.brand-tagline');
  if (tagline) {
    tagline.textContent = isHindi ? 'कम बर्बाद करें। स्मार्ट खाएं। हरा-भरा जिएं।' : 'Waste less. Eat smarter. Live greener.';
  }
}

function toggleHindi() {
  isHindi = !isHindi;
  document.body.classList.toggle('hindi-mode', isHindi);

  const btn = document.getElementById('hindi-toggle-btn');
  if (btn) {
    btn.classList.toggle('hindi-active', isHindi);
    btn.textContent = isHindi ? '🇮🇳 English' : '🇮🇳 हिंदी';
  }

  applyTranslation();

  // Persist preference
  localStorage.setItem('ft_lang', isHindi ? 'hi' : 'en');

  if (typeof toast === 'function') {
    toast(isHindi ? '🇮🇳 हिंदी में बदल दिया गया!' : '🇬🇧 Switched to English!', 'success');
  }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('hindi-toggle-btn');
  if (btn) btn.addEventListener('click', toggleHindi);

  // Restore saved preference
  if (localStorage.getItem('ft_lang') === 'hi') {
    toggleHindi();
  }

  // Re-run translation after dynamic content loads (observe DOM changes)
  const observer = new MutationObserver((mutations) => {
    if (!isHindi) return;
    for (const m of mutations) {
      if (m.addedNodes.length) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            setTimeout(() => applyTranslation(node), 50);
          }
        });
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Expose for external use
window.applyHindiTranslation = applyTranslation;
