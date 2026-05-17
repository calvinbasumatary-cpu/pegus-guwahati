/* ============================================
   PEGUS GUWAHATI – Main Script
   ============================================ */

'use strict';

/* ── CART STATE ── */
const cart = {
  items: [],
  add(product) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ ...product, qty: 1 });
    }
    this.save();
    this.updateUI();
  },
  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.updateUI();
  },
  save() {
    try { sessionStorage.setItem('pegus_cart', JSON.stringify(this.items)); } catch (_) {}
  },
  load() {
    try {
      const saved = sessionStorage.getItem('pegus_cart');
      if (saved) this.items = JSON.parse(saved);
    } catch (_) {}
  },
  get count() { return this.items.reduce((sum, i) => sum + i.qty, 0); },
  updateUI() {
    const badge = document.querySelector('.cart-count');
    if (badge) badge.textContent = this.count;
  }
};

/* ── MODAL ── */
const modal = {
  overlay: null,
  productName: null,

  init() {
    this.overlay = document.getElementById('orderModal');
    this.productName = document.getElementById('modalProductName');
    if (!this.overlay) return;

    // Close on overlay click
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay.classList.contains('open')) this.close();
    });

    // Close button
    const closeBtn = this.overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Form submit
    const form = document.getElementById('orderForm');
    if (form) form.addEventListener('submit', e => this.handleSubmit(e));
  },

  open(productName) {
    if (!this.overlay) return;
    if (this.productName) this.productName.textContent = productName || 'Selected Item';
    this.overlay.classList.add('open');
    this.overlay.setAttribute('aria-hidden', 'false');
    // Focus first input
    const firstInput = this.overlay.querySelector('input, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('open');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  },

  handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#orderName')?.value.trim();
    const size = form.querySelector('#orderSize')?.value;
    const qty  = form.querySelector('#orderQty')?.value;
    const msg  = form.querySelector('#orderMsg')?.value.trim();

    // Build Instagram DM message
    const product = document.getElementById('modalProductName')?.textContent || 'item';
    const dmText = encodeURIComponent(
      `Hi PEGUS! I want to order:\n` +
      `Product: ${product}\n` +
      `Name: ${name}\n` +
      `Size: ${size}\n` +
      `Qty: ${qty}\n` +
      (msg ? `Note: ${msg}` : '')
    );

    // Track interest
    analytics.track('order_intent', { product, size, qty });

    // Open Instagram DM (mobile deep link, fallback to web)
    const isMobile = /iPhone|Android/i.test(navigator.userAgent);
    const igUrl = isMobile
      ? `instagram://user?username=pegus.guwahati`
      : `https://www.instagram.com/pegus.guwahati`;

    window.open(igUrl, '_blank');
    this.close();
    toast.show('Redirecting to Instagram to complete order 📸');
    form.reset();
  }
};

/* ── TOAST ── */
const toast = {
  el: null,
  timer: null,

  init() {
    this.el = document.getElementById('toast');
  },

  show(msg, duration = 3500) {
    if (!this.el) return;
    this.el.textContent = msg;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('show'), duration);
  }
};

/* ── ANALYTICS (lightweight, no external deps) ── */
const analytics = {
  events: [],
  track(event, data = {}) {
    const entry = { event, data, ts: Date.now() };
    this.events.push(entry);
    // Could send to an endpoint later
    // console.log('[PEGUS Analytics]', entry);
  }
};

/* ── SEARCH ── */
const search = {
  input: null,
  products: [],

  init() {
    this.input = document.querySelector('.nav-search input');
    if (!this.input) return;

    // Collect all product names on page
    this.products = Array.from(document.querySelectorAll('.product-card')).map(card => ({
      el: card,
      name: card.querySelector('.product-name')?.textContent.toLowerCase() || '',
      price: card.querySelector('.product-price')?.textContent || ''
    }));

    this.input.addEventListener('input', () => this.filter(this.input.value));
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.input.value = ''; this.filter(''); }
    });
  },

  filter(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.products.forEach(p => p.el.style.display = '');
      return;
    }

    // Scroll to product section
    if (q.length > 1) {
      document.getElementById('drops')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    this.products.forEach(p => {
      const match = p.name.includes(q);
      p.el.style.display = match ? '' : 'none';
      if (match) p.el.style.outline = `2px solid var(--accent)`;
      else p.el.style.outline = '';
    });

    analytics.track('search', { query: q });
  }
};

/* ── SCROLL ANIMATIONS ── */
const scrollAnim = {
  observer: null,

  init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show everything
      document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
      return;
    }

    this.observer = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger children if it's a grid parent
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => entry.target.classList.add('visible'), delay * 80);
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up').forEach((el, i) => {
      el.dataset.delay = i % 6; // stagger in groups of 6
      this.observer.observe(el);
    });
  }
};

/* ── NAV ACTIVE STATE ── */
const navHighlight = {
  init() {
    const cats = document.querySelectorAll('.nav-cat');
    cats.forEach(cat => {
      cat.addEventListener('click', () => {
        cats.forEach(c => c.classList.remove('active'));
        cat.classList.add('active');
      });
    });

    // Scroll spy
    const sections = ['drops', 'categories', 'wholesale', 'location', 'reviews'];
    const sectionEls = sections.map(id => document.getElementById(id)).filter(Boolean);

    if (!('IntersectionObserver' in window)) return;

    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          cats.forEach(c => {
            const href = c.getAttribute('href');
            if (href === `#${id}`) c.classList.add('active');
            else c.classList.remove('active');
          });
        }
      });
    }, { threshold: 0.4 });

    sectionEls.forEach(el => spy.observe(el));
  }
};

/* ── QUICK ORDER BUTTONS ── */
const quickOrder = {
  init() {
    document.querySelectorAll('.quick-order').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.product-card');
        const name = card?.querySelector('.product-name')?.textContent || 'Product';
        const price = card?.querySelector('.product-price')?.textContent || '';

        analytics.track('quick_order_click', { name, price });
        modal.open(`${name} – ${price}`);
      });
    });

    // Also handle category tile clicks and banner clicks
    document.querySelectorAll('.cat-tile, .banner-card').forEach(el => {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }
};

/* ── MOBILE NAV SEARCH TOGGLE ── */
const mobileSearch = {
  init() {
    const navTop = document.querySelector('.nav-top');
    const searchBox = document.querySelector('.nav-search');
    if (!navTop || !searchBox) return;

    // On mobile, show a search icon that expands the search box
    const mobileSearchBtn = document.createElement('button');
    mobileSearchBtn.className = 'nav-action-btn mobile-search-toggle';
    mobileSearchBtn.setAttribute('aria-label', 'Toggle search');
    mobileSearchBtn.innerHTML = '<span class="nav-action-icon">🔍</span>';
    mobileSearchBtn.style.display = 'none';

    if (window.innerWidth <= 768) {
      mobileSearchBtn.style.display = 'flex';
    }

    mobileSearchBtn.addEventListener('click', () => {
      const isVisible = searchBox.style.display === 'flex';
      searchBox.style.display = isVisible ? 'none' : 'flex';
      searchBox.style.position = 'absolute';
      searchBox.style.top = '100%';
      searchBox.style.left = '0';
      searchBox.style.right = '0';
      searchBox.style.maxWidth = 'none';
      searchBox.style.margin = '0';
      searchBox.style.zIndex = '10';
      if (!isVisible) searchBox.querySelector('input')?.focus();
    });
  }
};

/* ── ANNOUNCE BAR DUPLICATE FIX ── */
// Ensure seamless ticker loop
function fixTicker() {
  const inner = document.querySelector('.announce-inner');
  if (!inner) return;
  // Already duplicated in HTML for seamless loop
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  cart.load();
  cart.updateUI();

  modal.init();
  toast.init();
  search.init();
  scrollAnim.init();
  navHighlight.init();
  quickOrder.init();
  mobileSearch.init();
  fixTicker();

  // Accessibility: add tabindex to interactive cards
  document.querySelectorAll('.cat-tile, .banner-card, .price-chip').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
});
