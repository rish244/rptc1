/* ==========================================================================
   RP TRANSPORT COMPANY (RPTC) — Transport Management System
   Frontend JavaScript connected to Express + SQLite Backend API (/api/*).
   ========================================================================== */
(function () {
  'use strict';

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const TOKEN_KEY = 'rptc_auth_token';
  let currentUser = null;
  let adminState = {
    stats: {},
    bookings: [],
    vehicles: [],
    quotes: [],
    messages: []
  };

  const COMPANY = {
    name: 'RP TRANSPORT COMPANY (RPTC)',
    tagline: 'WE DELIVER SAFE.',
    phone1: '+91 88283 83122',
    phone1Raw: '+918828383122',
    phone2: '+91 77387 33177',
    phone2Raw: '+917738733177',
    email: 'rptransportcompany28@gmail.com',
    whatsapp: '918828383122',
    address: 'D 5103, Bima Complex, Near Steel Market, Kalamboli, Navi Mumbai – 410218, Maharashtra, India'
  };
  const WA_MSG_DEFAULT = 'Hello RP TRANSPORT COMPANY, I would like to enquire about truck booking and freight charges.';
  const waLink = (msg) => 'https://wa.me/' + COMPANY.whatsapp + '?text=' + encodeURIComponent(msg || WA_MSG_DEFAULT);

  /* ---------- 1. Security & formatting helpers ---------- */
  function esc(val) {
    if (val == null) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getAuthToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_e) { return ''; }
  }

  function setAuthToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (_e) { /* ignore storage errors */ }
  }

  async function apiFetch(endpoint, options) {
    const opts = Object.assign({ method: 'GET', credentials: 'same-origin' }, options || {});
    const headers = Object.assign({}, opts.headers || {});
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    opts.headers = headers;

    const res = await fetch(endpoint, opts);
    let data = {};
    try {
      data = await res.json();
    } catch (_e) {
      data = {};
    }
    if (!res.ok) {
      const err = new Error(data.error || ('Request failed (' + res.status + ')'));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- 2. Booking status model & date helpers ---------- */
  const STATUS_FLOW = [
    { key: 'PENDING COMPANY CONFIRMATION', label: 'Booking Request Received' },
    { key: 'APPROVED',                     label: 'Booking Approved' },
    { key: 'VEHICLE ASSIGNED',             label: 'Vehicle Assigned' },
    { key: 'PICKED UP',                    label: 'Goods Picked Up' },
    { key: 'IN TRANSIT',                   label: 'In Transit' },
    { key: 'DELIVERED',                    label: 'Delivered' }
  ];

  function pillClass(status) {
    switch (status) {
      case 'PENDING COMPANY CONFIRMATION': return 'pill-pending';
      case 'APPROVED':                     return 'pill-approved';
      case 'VEHICLE ASSIGNED':
      case 'PICKED UP':
      case 'IN TRANSIT':                   return 'pill-progress';
      case 'DELIVERED':
      case 'RESOLVED':
      case 'QUOTATION SENT':               return 'pill-delivered';
      case 'REJECTED':                     return 'pill-rejected';
      default:                             return 'pill-pending';
    }
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- 3. Toast notifications & Modal dialog ---------- */
  function toast(message, type) {
    type = type || 'success';
    let container = $('#toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const titles = { success: 'Success', error: 'Attention', info: 'Information' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div><b>' + (titles[type] || 'Notice') + '</b><span>' + esc(message) + '</span></div>';
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 380);
    }, 4200);
  }

  function openModal(title, bodyHTML, onConfirm, confirmLabel) {
    let mb = $('#modalBackdrop');
    if (!mb) {
      mb = document.createElement('div');
      mb.id = 'modalBackdrop';
      mb.className = 'modal-backdrop';
      mb.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<div class="modal-head"><h3 id="modalTitle"></h3>' +
          '<button class="modal-close" id="modalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
          '<div class="modal-body" id="modalBody"></div>' +
          '<div class="modal-foot"><button class="btn btn-outline btn-sm" id="modalCancel">Cancel</button>' +
          '<button class="btn btn-red btn-sm" id="modalConfirm"></button></div>' +
        '</div>';
      document.body.appendChild(mb);
    }
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    const confirmBtn = $('#modalConfirm');
    confirmBtn.textContent = confirmLabel || 'Confirm';
    confirmBtn.hidden = !onConfirm;
    $('#modalCancel').textContent = onConfirm ? 'Cancel' : 'Close';

    mb.classList.add('show');
    document.body.classList.add('no-scroll');
    $('#modalClose').onclick = $('#modalCancel').onclick = closeModal;
    mb.onclick = (e) => { if (e.target === mb) closeModal(); };
    confirmBtn.onclick = async () => {
      if (!onConfirm) { closeModal(); return; }
      const res = await onConfirm();
      if (res !== false) closeModal();
    };
  }

  function closeModal() {
    const mb = $('#modalBackdrop');
    if (mb) mb.classList.remove('show');
    document.body.classList.remove('no-scroll');
  }

  /* ---------- 4. Navigation, Scroll Reveal & Misc ---------- */
  function initNav() {
    const burger = $('#hamburger'), links = $('#navLinks'), overlay = $('#navOverlay'), nav = $('#navbar');
    const closeMenu = () => {
      links && links.classList.remove('open');
      burger && burger.classList.remove('active');
      overlay && overlay.classList.remove('show');
      document.body.classList.remove('no-scroll');
    };
    if (burger) {
      burger.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        burger.classList.toggle('active', open);
        overlay && overlay.classList.toggle('show', open);
        document.body.classList.toggle('no-scroll', open);
      });
    }
    overlay && overlay.addEventListener('click', closeMenu);
    $$('#navLinks a').forEach(a => a.addEventListener('click', closeMenu));
    window.addEventListener('scroll', () => {
      nav && nav.classList.toggle('scrolled', window.scrollY > 10);
    });
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('#navLinks a[data-page]').forEach(a => {
      if ((a.dataset.page || '').toLowerCase() === page) a.classList.add('active');
    });
  }

  function updateNavForUser(user) {
    const loginLink = $('#navLinks a[data-page="login.html"]');
    if (!loginLink) return;
    if (user) {
      const firstName = (user.name || 'Account').split(' ')[0];
      if (user.role === 'admin') {
        loginLink.innerHTML = '<i class="fa-solid fa-user-shield"></i> Admin (' + esc(firstName) + ')';
        loginLink.href = 'admin.html';
      } else {
        loginLink.innerHTML = '<i class="fa-solid fa-user-check"></i> Hi, ' + esc(firstName);
        loginLink.href = 'login.html';
      }
    } else {
      loginLink.textContent = 'Login';
      loginLink.href = 'login.html';
    }
  }

  async function syncCurrentUser() {
    try {
      const data = await apiFetch('/api/auth/me');
      currentUser = data.user || null;
      if (!currentUser) setAuthToken('');
    } catch (_e) {
      currentUser = null;
    }
    updateNavForUser(currentUser);
    prefillUserForms(currentUser);
    return currentUser;
  }

  function prefillUserForms(user) {
    if (!user) return;
    const setIfEmpty = (sel, val) => {
      const el = $(sel);
      if (el && !el.value && val) el.value = val;
    };
    setIfEmpty('#bookingForm [name="cName"]', user.name);
    setIfEmpty('#bookingForm [name="cEmail"]', user.email);
    setIfEmpty('#bookingForm [name="cMobile"]', user.mobile);
    setIfEmpty('#contactForm [name="ctName"]', user.name);
    setIfEmpty('#contactForm [name="ctEmail"]', user.email);
    setIfEmpty('#contactForm [name="ctMobile"]', user.mobile);
    setIfEmpty('#quickBookForm [name="name"]', user.name);
    setIfEmpty('#quickBookForm [name="mobile"]', user.mobile);
  }

  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => {
      if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + 'ms';
      io.observe(el);
    });
  }

  function initMisc() {
    const today = new Date().toISOString().split('T')[0];
    $$('input[type="date"]').forEach(i => { if (!i.min) i.min = today; });
    const backTop = $('#backTop');
    if (backTop) {
      window.addEventListener('scroll', () => backTop.classList.toggle('show', window.scrollY > 500));
      backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    $$('.year').forEach(el => el.textContent = new Date().getFullYear());
    $$('.wa-link').forEach(a => {
      if (!a.getAttribute('href') || a.getAttribute('href').indexOf('wa.me') === -1) {
        a.href = waLink(a.dataset.msg || WA_MSG_DEFAULT);
      }
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- 5. Form validation ---------- */
  function markInvalid(input, msg) {
    const g = input && input.closest('.form-group');
    if (!g) return;
    g.classList.add('invalid');
    const e = $('.error-msg', g);
    if (e) e.textContent = msg;
  }

  function validateForm(form) {
    $$('.form-group.invalid', form).forEach(g => g.classList.remove('invalid'));
    let ok = true, first = null;
    $$('[required]', form).forEach(inp => {
      const val = (inp.value || '').trim();
      if (!val) { markInvalid(inp, 'This field is required.'); ok = false; first = first || inp; return; }
      if (inp.dataset.validate === 'mobile' && !/^[6-9]\d{9}$/.test(val.replace(/[\s-]/g, ''))) {
        markInvalid(inp, 'Enter a valid 10-digit Indian mobile number.'); ok = false; first = first || inp;
      }
      if (inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        markInvalid(inp, 'Enter a valid email address.'); ok = false; first = first || inp;
      }
      if (inp.dataset.validate === 'pin' && !/^\d{6}$/.test(val)) {
        markInvalid(inp, 'Enter a valid 6-digit PIN code.'); ok = false; first = first || inp;
      }
      if (inp.dataset.min && parseFloat(val) <= 0) {
        markInvalid(inp, 'Enter a value greater than zero.'); ok = false; first = first || inp;
      }
      if (inp.minLength > 0 && val.length < inp.minLength) {
        markInvalid(inp, 'Must be at least ' + inp.minLength + ' characters.'); ok = false; first = first || inp;
      }
    });
    if (first) first.focus();
    return ok;
  }

  document.addEventListener('input', e => {
    const g = e.target.closest && e.target.closest('.form-group.invalid');
    if (g) g.classList.remove('invalid');
  });

  /* ---------- 6. HOME PAGE: Live Fleet Availability Check ---------- */
  function initHomePage() {
    const form = $('#quickBookForm');
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const btn = $('#quickBookBtn');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking live fleet…';
      try {
        const d = Object.fromEntries(new FormData(form).entries());
        const res = await apiFetch('/api/availability', { method: 'POST', body: d });
        renderAvailability(d, res);
      } catch (err) {
        toast(err.message || 'Unable to check availability right now.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  }

  function renderAvailability(d, apiData) {
    const panel = $('#availabilityResult');
    $('#avRoute').textContent = d.pickup + '  →  ' + d.delivery;
    $('#avMeta').textContent = 'Pickup: ' + fmtDate(d.pickupDate) + '  ·  Truck: ' + d.truck + '  ·  Weight: ' + d.weight + ' tons  ·  Material: ' + d.material;
    const list = $('#avList');
    const items = (apiData && apiData.items) || [];
    list.innerHTML = items.map(s =>
      '<div class="avail-item">' +
        '<div class="avail-icon"><i class="fa-solid ' + esc(s.icon || 'fa-truck') + '"></i></div>' +
        '<div class="avail-info"><b>' + esc(s.name) + '</b><span>' + esc(s.cap) + '</span></div>' +
        '<span class="pill ' + esc(s.badgeClass || 'pill-pending') + '">' + esc(s.badge || 'Available') + '</span>' +
      '</div>'
    ).join('');

    const params = new URLSearchParams({
      pickup: d.pickup, delivery: d.delivery, date: d.pickupDate, truck: d.truck,
      weight: d.weight, material: d.material, name: d.name, mobile: d.mobile
    });
    $('#avProceed').href = 'booking.html?' + params.toString();
    $('#avWhatsapp').href = waLink(
      'Hello RP TRANSPORT COMPANY, I would like to enquire about truck booking. Route: ' + d.pickup + ' to ' + d.delivery +
      '. Truck: ' + d.truck + '. Weight: ' + d.weight + ' tons. Pickup date: ' + d.pickupDate + '. My mobile: ' + d.mobile + '.'
    );
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Fleet availability checked against RPTC live database.', 'success');
  }

  /* ---------- 7. BOOKING PAGE: Full Online Truck Booking ---------- */
  function initBookingPage() {
    const form = $('#bookingForm');
    if (!form) return;

    const q = new URLSearchParams(location.search);
    const map = { pickup: 'pCity', delivery: 'dCity', date: 'pDate', truck: 'vType', weight: 'gWeight', material: 'gMaterial', name: 'cName', mobile: 'cMobile' };
    Object.keys(map).forEach(k => {
      if (q.get(k)) {
        const el = form.querySelector('[name="' + map[k] + '"]');
        if (el) el.value = q.get(k);
      }
    });
    if (q.get('pickup')) { const pa = form.querySelector('[name="pAddress"]'); if (pa && !pa.value) pa.value = q.get('pickup'); }
    if (q.get('delivery')) { const da = form.querySelector('[name="dAddress"]'); if (da && !da.value) da.value = q.get('delivery'); }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const submitBtn = form.querySelector('button[type="submit"]');
      const origHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Booking…'; }

      const v = (n) => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const payload = {
        customer: { name: v('cName'), company: v('cCompany'), mobile: v('cMobile'), email: v('cEmail'), gst: v('cGst') },
        pickup:   { address: v('pAddress'), city: v('pCity'), state: v('pState'), pin: v('pPin'), date: v('pDate'), time: v('pTime') },
        delivery: { address: v('dAddress'), city: v('dCity'), state: v('dState'), pin: v('dPin') },
        goods:    { material: v('gMaterial'), category: v('gCategory'), weight: v('gWeight'), packages: v('gPackages'), dimensions: v('gDimensions'), handling: v('gHandling') },
        vehicle:  { type: v('vType'), capacity: v('vCapacity') },
        payment:  { freight: v('payFreight'), advance: v('payAdvance'), instructions: v('payInstructions') }
      };

      try {
        const res = await apiFetch('/api/bookings', { method: 'POST', body: payload });
        renderBookingSummary(res.booking);
        toast('Booking request ' + res.booking.ref + ' saved to server!', 'success');
        form.reset();
        prefillUserForms(currentUser);
      } catch (err) {
        toast(err.message || 'Could not submit booking.', 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHtml; }
      }
    });

    $('#bookingReset') && $('#bookingReset').addEventListener('click', () => {
      $('#bookingSummary').hidden = true;
      toast('Form has been reset.', 'info');
    });
    $('#printBookingBtn') && $('#printBookingBtn').addEventListener('click', () => window.print());
  }

  function renderBookingSummary(b) {
    const wrap = $('#bookingSummary');
    $('#sumRef').textContent = b.ref;
    const pill = $('#sumStatus');
    pill.textContent = b.status;
    pill.className = 'pill ' + pillClass(b.status);
    $('#sumName').textContent = b.customer.name + (b.customer.company ? ' (' + b.customer.company + ')' : '');
    $('#sumRoute').textContent = b.pickup.city + ' → ' + b.delivery.city;
    $('#sumPickup').textContent = b.pickup.address + ', ' + b.pickup.city + ' – ' + b.pickup.pin;
    $('#sumDelivery').textContent = b.delivery.address + ', ' + b.delivery.city + ' – ' + b.delivery.pin;
    $('#sumDate').textContent = fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + b.pickup.time : '');
    $('#sumVehicle').textContent = b.vehicle.type + (b.vehicle.capacity ? ' · ' + b.vehicle.capacity : '');
    $('#sumGoods').textContent = b.goods.material + ' · ' + b.goods.weight + ' T · ' + (b.goods.packages || '—') + ' packages';
    $('#sumContact').textContent = b.customer.mobile + (b.customer.email ? ' · ' + b.customer.email : '');
    $('#sumSubmitted').textContent = fmtDateTime(b.createdAt);
    $('#sumWhatsapp').href = waLink(
      'Hello RP TRANSPORT COMPANY, I submitted booking request ' + b.ref + '. Route: ' + b.pickup.city + ' to ' + b.delivery.city +
      '. Vehicle: ' + b.vehicle.type + '. Pickup date: ' + b.pickup.date + '.'
    );
    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 8. FREIGHT QUOTATION ---------- */
  function initQuotation() {
    const form = $('#quoteForm');
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const submitBtn = form.querySelector('button[type="submit"]');
      const origHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…'; }

      const v = (n) => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const payload = {
        pickupCity: v('qPickup'),
        deliveryCity: v('qDelivery'),
        material: v('qMaterial'),
        weight: v('qWeight'),
        truck: v('qTruck'),
        date: v('qDate'),
        contact: v('qContact')
      };

      try {
        const res = await apiFetch('/api/quotes', { method: 'POST', body: payload });
        renderQuoteSummary(res.quote);
        toast('Freight quotation ' + res.quote.ref + ' recorded!', 'success');
        form.reset();
      } catch (err) {
        toast(err.message || 'Could not submit quotation request.', 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHtml; }
      }
    });
  }

  function renderQuoteSummary(q) {
    const wrap = $('#quoteSummary');
    $('#qRef').textContent = q.ref;
    const pill = $('#qStatus');
    pill.textContent = q.status;
    pill.className = 'pill ' + pillClass(q.status);
    $('#qRoute').textContent = q.pickupCity + '  →  ' + q.deliveryCity;
    $('#qDetails').textContent = 'Material: ' + q.material + ' · Weight: ' + q.weight + ' T · Truck: ' + q.truck + ' · Pickup: ' + fmtDate(q.date);
    $('#qEstLow').textContent = '₹' + Number(q.estimate.low).toLocaleString('en-IN');
    $('#qEstHigh').textContent = '₹' + Number(q.estimate.high).toLocaleString('en-IN');
    $('#qWhatsapp').href = waLink(
      'Hello RP TRANSPORT COMPANY, I requested a freight quotation ' + q.ref + ' for route ' + q.pickupCity + ' to ' + q.deliveryCity +
      ', ' + q.truck + ', ' + q.weight + ' tons. Please share the final quotation.'
    );
    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 9. SHIPMENT TRACKING PAGE ---------- */
  function initTrackingPage() {
    const form = $('#trackingForm');
    if (!form) return;

    async function lookupRef(rawRef) {
      const ref = (rawRef || '').trim().toUpperCase();
      if (!ref) { toast('Please enter a booking reference number.', 'error'); return; }
      const wrap = $('#trackingResult');
      try {
        const data = await apiFetch('/api/bookings/track/' + encodeURIComponent(ref));
        const booking = data.booking;
        $('#trackNotFound').hidden = true;
        $('#trackFound').hidden = false;
        $('#tRef').textContent = booking.ref;
        $('#tSample').hidden = !booking.sample;
        const pill = $('#tStatus');
        pill.textContent = booking.status;
        pill.className = 'pill ' + pillClass(booking.status);
        $('#tRoute').textContent = booking.pickup.city + '  →  ' + booking.delivery.city;
        $('#tPickup').textContent = booking.pickup.address + ', ' + booking.pickup.city + ' – ' + booking.pickup.pin;
        $('#tDelivery').textContent = booking.delivery.address + ', ' + booking.delivery.city + ' – ' + booking.delivery.pin;
        $('#tVehicle').textContent = booking.vehicle.type + (booking.vehicle.capacity ? ' · ' + booking.vehicle.capacity : '') + (booking.vehicleReg ? ' · ' + booking.vehicleReg : '');
        $('#tDate').textContent = fmtDate(booking.pickup.date);
        const last = (booking.history || []).slice(-1)[0];
        $('#tUpdated').textContent = last ? fmtDateTime(last.at) : fmtDateTime(booking.createdAt);
        $('#tEta').textContent = booking.eta ? fmtDate(booking.eta) : 'Will be shared after company confirmation';
        renderTimeline(booking.status);
        wrap.hidden = false;
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        $('#trackFound').hidden = true;
        $('#trackNotFound').hidden = false;
        $('#notFoundRef').textContent = ref;
        wrap.hidden = false;
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      lookupRef($('#trackRef').value);
    });

    // Auto-search if ?ref=RPTC-... is passed in URL
    const qRef = new URLSearchParams(location.search).get('ref');
    if (qRef) {
      $('#trackRef').value = qRef.trim().toUpperCase();
      lookupRef(qRef);
    }
  }

  function renderTimeline(status) {
    const rejected = status === 'REJECTED';
    const idx = STATUS_FLOW.findIndex(s => s.key === status);
    const icons = ['fa-clipboard-list', 'fa-circle-check', 'fa-truck', 'fa-box-open', 'fa-route', 'fa-flag-checkered'];
    const wrap = $('#timeline');
    wrap.innerHTML = STATUS_FLOW.map((s, i) => {
      let cls = 'tl-step';
      if (!rejected) {
        if (i < idx) cls += ' done';
        else if (i === idx) cls += ' active';
      }
      const reached = !rejected && i <= idx;
      return '<div class="' + cls + '">' +
        '<div class="tl-dot"><i class="fa-solid ' + (!rejected && i < idx ? 'fa-check' : icons[i]) + '"></i></div>' +
        '<h4>' + esc(s.label) + '</h4>' +
        '<p>' + (rejected ? '—' : (reached ? 'Reached' : 'Pending')) + '</p>' +
      '</div>';
    }).join('');
    $('#timelineRejected').hidden = !rejected;
  }

  /* ---------- 10. CONTACT PAGE ---------- */
  function initContactPage() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const submitBtn = form.querySelector('button[type="submit"]');
      const origHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…'; }

      const v = (n) => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      try {
        await apiFetch('/api/contact', {
          method: 'POST',
          body: {
            name: v('ctName'),
            mobile: v('ctMobile'),
            email: v('ctEmail'),
            subject: v('ctSubject'),
            message: v('ctMessage')
          }
        });
        $('#contactSuccess').hidden = false;
        toast('Your message has been delivered to RP TRANSPORT COMPANY!', 'success');
        form.reset();
        prefillUserForms(currentUser);
        $('#contactSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        toast(err.message || 'Could not send message.', 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHtml; }
      }
    });
  }

  /* ---------- 11. CUSTOMER LOGIN & REGISTRATION ---------- */
  async function initAuthPage() {
    const loginPanel = $('#loginPanel'), registerPanel = $('#registerPanel');
    if (!loginPanel) return;

    const tabLogin = $('#tabLogin'), tabRegister = $('#tabRegister');
    const authTabs = $('#authTabs');
    const sessionBox = $('#authSession'), formsBox = $('#authForms');
    const myBookingsPanel = $('#myBookingsPanel');

    const showTab = (which) => {
      const isLogin = which === 'login';
      loginPanel.hidden = !isLogin;
      registerPanel.hidden = isLogin;
      tabLogin.classList.toggle('active', isLogin);
      tabRegister.classList.toggle('active', !isLogin);
    };
    tabLogin.addEventListener('click', () => showTab('login'));
    tabRegister.addEventListener('click', () => showTab('register'));

    async function loadMyBookings() {
      if (!myBookingsPanel) return;
      try {
        const res = await apiFetch('/api/bookings/my');
        const list = res.bookings || [];
        myBookingsPanel.hidden = false;
        const tbody = $('#myBookingsBody');
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-inbox"></i>You have not submitted any bookings yet.</div></td></tr>';
          return;
        }
        tbody.innerHTML = list.map(b =>
          '<tr>' +
            '<td><b>' + esc(b.ref) + '</b></td>' +
            '<td>' + esc(b.pickup.city) + ' → ' + esc(b.delivery.city) + '</td>' +
            '<td>' + esc(b.vehicle.type) + '</td>' +
            '<td>' + esc(fmtDate(b.pickup.date)) + '</td>' +
            '<td><span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span></td>' +
            '<td><a class="btn btn-outline btn-sm" href="tracking.html?ref=' + encodeURIComponent(b.ref) + '"><i class="fa-solid fa-magnifying-glass-location"></i> Track</a></td>' +
          '</tr>'
        ).join('');
      } catch (_e) {
        myBookingsPanel.hidden = true;
      }
    }

    async function showSession(user) {
      formsBox.hidden = true;
      if (authTabs) authTabs.hidden = true;
      sessionBox.hidden = false;
      $('#sessionName').textContent = user.name;
      const meta = $('#sessionMeta');
      if (meta) {
        meta.textContent = user.email + (user.mobile ? ' · +91 ' + user.mobile : '') + (user.role === 'admin' ? ' · Administrator' : ' · Customer Account');
      }
      const adminBtn = $('#sessionAdminBtn');
      if (adminBtn) adminBtn.hidden = user.role !== 'admin';
      await loadMyBookings();
    }

    if (currentUser) {
      await showSession(currentUser);
    }

    $('#logoutBtn') && $('#logoutBtn').addEventListener('click', async () => {
      try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (_e) {}
      setAuthToken('');
      currentUser = null;
      updateNavForUser(null);
      sessionBox.hidden = true;
      formsBox.hidden = false;
      if (authTabs) authTabs.hidden = false;
      if (myBookingsPanel) myBookingsPanel.hidden = true;
      toast('You have been logged out.', 'info');
    });

    $('#registerForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      if (!validateForm(form)) return;
      const pass = form.rPass.value, confirm = form.rPass2.value;
      if (pass !== confirm) { markInvalid(form.rPass2, 'Passwords do not match.'); return; }

      const btn = $('#registerSubmitBtn');
      const orig = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account…'; }

      try {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: {
            name: form.rName.value.trim(),
            email: form.rEmail.value.trim().toLowerCase(),
            mobile: form.rMobile.value.trim(),
            password: pass
          }
        });
        setAuthToken(res.token);
        currentUser = res.user;
        updateNavForUser(currentUser);
        form.reset();
        toast('Account created! Welcome, ' + currentUser.name + '.', 'success');
        await showSession(currentUser);
      } catch (err) {
        toast(err.message || 'Registration failed.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
      }
    });

    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      if (!validateForm(form)) return;

      const btn = $('#loginSubmitBtn');
      const orig = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…'; }

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: {
            email: form.lEmail.value.trim().toLowerCase(),
            password: form.lPass.value
          }
        });
        setAuthToken(res.token);
        currentUser = res.user;
        updateNavForUser(currentUser);
        form.reset();
        toast('Welcome back, ' + currentUser.name + '!', 'success');
        await showSession(currentUser);
      } catch (err) {
        markInvalid(form.lPass, err.message || 'Invalid email or password.');
        toast(err.message || 'Login failed.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
      }
    });
  }

  /* ---------- 12. PROTECTED ADMIN DASHBOARD ---------- */
  async function initAdminPage() {
    if (!$('#adminDashboard')) return;

    const gate = $('#adminLoginGate');
    const content = $('#adminProtectedContent');
    const loginForm = $('#adminLoginForm');

    async function loadDashboardData() {
      try {
        const data = await apiFetch('/api/admin/dashboard');
        adminState = data;
        renderAdminStats();
        renderBookingsTable();
        renderQuotesTable();
        renderMessagesTable();
        renderVehiclesTable();
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          showGate();
        } else {
          toast(err.message || 'Failed to load dashboard data.', 'error');
        }
      }
    }

    function showGate() {
      if (gate) gate.hidden = false;
      if (content) content.hidden = true;
    }

    async function unlockDashboard() {
      if (gate) gate.hidden = true;
      if (content) content.hidden = false;
      const lbl = $('#adminUserLabel');
      if (lbl && currentUser) {
        lbl.textContent = currentUser.name + ' (' + currentUser.email + ')';
      }
      await loadDashboardData();
    }

    if (currentUser && currentUser.role === 'admin') {
      await unlockDashboard();
    } else {
      showGate();
    }

    loginForm && loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm(loginForm)) return;
      const btn = $('#adminLoginBtn');
      const orig = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…'; }

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: {
            email: loginForm.aEmail.value.trim().toLowerCase(),
            password: loginForm.aPass.value
          }
        });
        if (!res.user || res.user.role !== 'admin') {
          toast('Access denied: Administrator account required.', 'error');
          return;
        }
        setAuthToken(res.token);
        currentUser = res.user;
        updateNavForUser(currentUser);
        loginForm.reset();
        toast('Signed in as ' + currentUser.name + '.', 'success');
        await unlockDashboard();
      } catch (err) {
        markInvalid(loginForm.aPass, err.message || 'Invalid credentials.');
        toast(err.message || 'Admin login failed.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
      }
    });

    $('#adminRefreshBtn') && $('#adminRefreshBtn').addEventListener('click', async () => {
      await loadDashboardData();
      toast('Dashboard data refreshed.', 'info');
    });

    $('#adminLogoutBtn') && $('#adminLogoutBtn').addEventListener('click', async () => {
      try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (_e) {}
      setAuthToken('');
      currentUser = null;
      updateNavForUser(null);
      showGate();
      toast('Logged out of Admin Portal.', 'info');
    });

    $('#bookingFilter') && $('#bookingFilter').addEventListener('change', renderBookingsTable);

    // Booking table actions
    $('#bookingsTableBody') && $('#bookingsTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const ref = btn.dataset.ref, action = btn.dataset.action;
      if (action === 'view') viewBooking(ref);
      if (action === 'approve') approveBooking(ref, loadDashboardData);
      if (action === 'reject') rejectBooking(ref, loadDashboardData);
      if (action === 'assign') assignVehicle(ref, loadDashboardData);
      if (action === 'status') updateStatus(ref, loadDashboardData);
      if (action === 'print') printBooking(ref);
    });

    // Quotes table actions
    $('#quotesTableBody') && $('#quotesTableBody').addEventListener('click', async e => {
      const btn = e.target.closest('button[data-quote-ref]');
      if (!btn) return;
      const ref = btn.dataset.quoteRef;
      openModal(
        'Update Quotation — ' + ref,
        '<div class="form-group" style="margin-bottom:14px;"><label>Status</label>' +
          '<select id="quoteStatusSelect"><option value="QUOTATION SENT">Quotation Sent</option><option value="AWAITING QUOTATION">Awaiting Quotation</option><option value="CLOSED">Closed</option></select></div>' +
        '<div class="form-group"><label>Admin Note / Final Rate Remarks</label><input type="text" id="quoteAdminNote" placeholder="e.g. Final rate ₹18,500 shared on phone"></div>',
        async () => {
          try {
            await apiFetch('/api/admin/quotes/' + encodeURIComponent(ref), {
              method: 'PATCH',
              body: {
                status: $('#quoteStatusSelect').value,
                adminNote: $('#quoteAdminNote').value.trim()
              }
            });
            await loadDashboardData();
            toast('Quotation ' + ref + ' updated.', 'success');
          } catch (err) {
            toast(err.message || 'Failed to update quotation.', 'error');
            return false;
          }
        },
        'Save'
      );
    });

    // Contact messages actions
    $('#messagesTableBody') && $('#messagesTableBody').addEventListener('click', async e => {
      const btn = e.target.closest('button[data-msg-id]');
      if (!btn) return;
      const id = btn.dataset.msgId;
      const nextStatus = btn.dataset.nextStatus || 'RESOLVED';
      try {
        await apiFetch('/api/admin/messages/' + encodeURIComponent(id), {
          method: 'PATCH',
          body: { status: nextStatus }
        });
        await loadDashboardData();
        toast('Enquiry marked as ' + nextStatus.toLowerCase() + '.', 'success');
      } catch (err) {
        toast(err.message || 'Could not update enquiry.', 'error');
      }
    });

    // Fleet form (add / update)
    const vForm = $('#vehicleForm');
    vForm && vForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm(vForm)) return;
      const v = (n) => { const el = vForm.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const id = vForm.vId.value.trim();
      const payload = {
        reg: v('vReg'),
        type: v('vType'),
        capacity: v('vCapacity'),
        driver: v('vDriver'),
        contact: v('vContact'),
        availability: v('vAvailability'),
        location: v('vLocation'),
        assigned: v('vAssigned')
      };

      try {
        if (id) {
          await apiFetch('/api/admin/vehicles/' + encodeURIComponent(id), { method: 'PUT', body: payload });
          toast('Vehicle ' + payload.reg.toUpperCase() + ' updated.', 'success');
        } else {
          await apiFetch('/api/admin/vehicles', { method: 'POST', body: payload });
          toast('Vehicle ' + payload.reg.toUpperCase() + ' added to fleet!', 'success');
        }
        vForm.reset();
        vForm.vId.value = '';
        $('#vehicleFormTitle').textContent = 'Add Vehicle to Fleet';
        await loadDashboardData();
      } catch (err) {
        toast(err.message || 'Could not save vehicle.', 'error');
      }
    });

    $('#vehicleReset') && $('#vehicleReset').addEventListener('click', () => {
      vForm.reset();
      vForm.vId.value = '';
      $('#vehicleFormTitle').textContent = 'Add Vehicle to Fleet';
    });

    $('#vehiclesTableBody') && $('#vehiclesTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') editVehicle(id);
      if (btn.dataset.action === 'delete') deleteVehicle(id, loadDashboardData);
    });
  }

  function renderAdminStats() {
    const s = adminState.stats || {};
    $('#stTotal').textContent = s.totalBookings || 0;
    $('#stPending').textContent = s.pendingBookings || 0;
    $('#stApproved').textContent = s.approvedBookings || 0;
    $('#stCompleted').textContent = s.completedBookings || 0;
    $('#stQuotes').textContent = s.totalQuotes || 0;
    const unreadEl = $('#unreadMsgCount');
    if (unreadEl) unreadEl.textContent = s.unreadMessages || 0;
  }

  function renderBookingsTable() {
    const tbody = $('#bookingsTableBody');
    if (!tbody) return;
    const filter = ($('#bookingFilter') && $('#bookingFilter').value) || 'ALL';
    let bookings = (adminState.bookings || []).slice();
    if (filter !== 'ALL') bookings = bookings.filter(b => b.status === filter);
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-inbox"></i>No booking requests found.</div></td></tr>';
      return;
    }
    tbody.innerHTML = bookings.map(b =>
      '<tr>' +
        '<td><b>' + esc(b.ref) + '</b>' + (b.sample ? ' <span class="demo-tag">Sample</span>' : '') + '</td>' +
        '<td>' + esc(b.customer.name || '—') + '<br><small style="color:var(--muted);">' + esc(b.customer.mobile || '') + '</small></td>' +
        '<td>' + esc(b.pickup.city || '—') + ' → ' + esc(b.delivery.city || '—') + '</td>' +
        '<td>' + esc(b.vehicle.type || '—') + (b.vehicleReg ? '<br><small style="color:var(--navy);font-weight:600;">' + esc(b.vehicleReg) + '</small>' : '') + '</td>' +
        '<td>' + esc(fmtDate(b.pickup.date)) + '</td>' +
        '<td><span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-icon" data-action="view" data-ref="' + esc(b.ref) + '" title="View Booking"><i class="fa-solid fa-eye"></i></button>' +
          '<button class="btn-icon green" data-action="approve" data-ref="' + esc(b.ref) + '" title="Approve Request"><i class="fa-solid fa-check"></i></button>' +
          '<button class="btn-icon red" data-action="reject" data-ref="' + esc(b.ref) + '" title="Reject Request"><i class="fa-solid fa-xmark"></i></button>' +
          '<button class="btn-icon" data-action="assign" data-ref="' + esc(b.ref) + '" title="Assign Vehicle"><i class="fa-solid fa-truck-fast"></i></button>' +
          '<button class="btn-icon" data-action="status" data-ref="' + esc(b.ref) + '" title="Update Shipment Status"><i class="fa-solid fa-rotate"></i></button>' +
          '<button class="btn-icon" data-action="print" data-ref="' + esc(b.ref) + '" title="Print Booking Details"><i class="fa-solid fa-print"></i></button>' +
        '</div></td>' +
      '</tr>'
    ).join('');
  }

  function renderQuotesTable() {
    const tbody = $('#quotesTableBody');
    if (!tbody) return;
    const quotes = adminState.quotes || [];
    if (!quotes.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-file-invoice"></i>No quotation requests yet.</div></td></tr>';
      return;
    }
    tbody.innerHTML = quotes.map(q =>
      '<tr>' +
        '<td><b>' + esc(q.ref) + '</b>' + (q.sample ? ' <span class="demo-tag">Sample</span>' : '') + '</td>' +
        '<td>' + esc(q.pickupCity) + ' → ' + esc(q.deliveryCity) + '<br><small style="color:var(--muted);">' + esc(fmtDate(q.date)) + '</small></td>' +
        '<td>' + esc(q.material) + ' (' + esc(q.weight) + ' T)</td>' +
        '<td>' + esc(q.truck) + '</td>' +
        '<td>₹' + Number(q.estimate.low).toLocaleString('en-IN') + ' – ₹' + Number(q.estimate.high).toLocaleString('en-IN') + '</td>' +
        '<td><a href="tel:+91' + esc(q.contact) + '" style="color:var(--navy);font-weight:600;">' + esc(q.contact) + '</a></td>' +
        '<td><span class="pill ' + pillClass(q.status) + '">' + esc(q.status) + '</span>' + (q.adminNote ? '<br><small style="color:var(--muted);">' + esc(q.adminNote) + '</small>' : '') + '</td>' +
        '<td><button class="btn-icon" data-quote-ref="' + esc(q.ref) + '" title="Update Quotation"><i class="fa-solid fa-pen-to-square"></i></button></td>' +
      '</tr>'
    ).join('');
  }

  function renderMessagesTable() {
    const tbody = $('#messagesTableBody');
    if (!tbody) return;
    const messages = adminState.messages || [];
    if (!messages.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-envelope-open"></i>No contact enquiries received yet.</div></td></tr>';
      return;
    }
    tbody.innerHTML = messages.map(m =>
      '<tr>' +
        '<td>' + esc(fmtDateTime(m.created_at)) + '</td>' +
        '<td><b>' + esc(m.name) + '</b></td>' +
        '<td>' + esc(m.mobile) + (m.email ? '<br><small style="color:var(--muted);">' + esc(m.email) + '</small>' : '') + '</td>' +
        '<td><b>' + esc(m.subject) + '</b><br><span style="font-size:13.5px;color:var(--text);">' + esc(m.message) + '</span></td>' +
        '<td><span class="pill ' + (m.status === 'RESOLVED' ? 'pill-delivered' : 'pill-pending') + '">' + esc(m.status) + '</span></td>' +
        '<td>' +
          (m.status === 'UNREAD'
            ? '<button class="btn-icon green" data-msg-id="' + esc(m.id) + '" data-next-status="RESOLVED" title="Mark Resolved"><i class="fa-solid fa-check"></i></button>'
            : '<button class="btn-icon" data-msg-id="' + esc(m.id) + '" data-next-status="UNREAD" title="Reopen"><i class="fa-solid fa-rotate-left"></i></button>') +
        '</td>' +
      '</tr>'
    ).join('');
  }

  function renderVehiclesTable() {
    const tbody = $('#vehiclesTableBody');
    if (!tbody) return;
    const vehicles = adminState.vehicles || [];
    if (!vehicles.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-truck"></i>No vehicles in fleet yet.</div></td></tr>';
      return;
    }
    tbody.innerHTML = vehicles.map(v =>
      '<tr>' +
        '<td><b>' + esc(v.reg) + '</b></td>' +
        '<td>' + esc(v.type) + '</td>' +
        '<td>' + esc(v.capacity) + '</td>' +
        '<td>' + esc(v.driver) + '</td>' +
        '<td>' + esc(v.contact) + '</td>' +
        '<td><span class="pill ' + (v.availability === 'Available' ? 'pill-delivered' : (v.availability === 'On Trip' ? 'pill-progress' : 'pill-pending')) + '">' + esc(v.availability) + '</span></td>' +
        '<td>' + esc(v.location || '—') + '</td>' +
        '<td>' + esc(v.assigned || '—') + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-icon" data-action="edit" data-id="' + esc(v.id) + '" title="Edit Vehicle"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="btn-icon red" data-action="delete" data-id="' + esc(v.id) + '" title="Remove Vehicle"><i class="fa-solid fa-trash"></i></button>' +
        '</div></td>' +
      '</tr>'
    ).join('');
  }

  async function approveBooking(ref, reload) {
    try {
      await apiFetch('/api/admin/bookings/' + encodeURIComponent(ref) + '/approve', { method: 'PATCH' });
      await reload();
      toast('Booking ' + ref + ' approved!', 'success');
    } catch (err) {
      toast(err.message || 'Approval failed.', 'error');
    }
  }

  function rejectBooking(ref, reload) {
    openModal(
      'Reject Booking Request',
      '<p style="margin-bottom:12px;">Reject booking request <b>' + esc(ref) + '</b>?</p>' +
      '<div class="form-group"><label>Reason (optional)</label><input type="text" id="rejectReasonInput" placeholder="e.g. Route currently unserviceable"></div>',
      async () => {
        try {
          const reason = ($('#rejectReasonInput') && $('#rejectReasonInput').value.trim()) || '';
          await apiFetch('/api/admin/bookings/' + encodeURIComponent(ref) + '/reject', {
            method: 'PATCH',
            body: { reason }
          });
          await reload();
          toast('Booking ' + ref + ' rejected.', 'info');
        } catch (err) {
          toast(err.message || 'Could not reject booking.', 'error');
          return false;
        }
      },
      'Reject Booking'
    );
  }

  function assignVehicle(ref, reload) {
    const vehicles = adminState.vehicles || [];
    if (!vehicles.length) { toast('No vehicles in fleet. Add a vehicle first.', 'error'); return; }
    const options = vehicles.map(v =>
      '<option value="' + esc(v.id) + '">' + esc(v.reg) + ' — ' + esc(v.type) + ' (' + esc(v.availability) + ')</option>'
    ).join('');
    openModal(
      'Assign Vehicle to ' + ref,
      '<div class="form-group"><label>Select Fleet Vehicle</label><select id="assignVehicleSelect">' + options + '</select></div>',
      async () => {
        try {
          const vehicleId = $('#assignVehicleSelect').value;
          await apiFetch('/api/admin/bookings/' + encodeURIComponent(ref) + '/assign', {
            method: 'PATCH',
            body: { vehicleId }
          });
          await reload();
          toast('Vehicle assigned to ' + ref + '!', 'success');
        } catch (err) {
          toast(err.message || 'Vehicle assignment failed.', 'error');
          return false;
        }
      },
      'Assign Vehicle'
    );
  }

  function updateStatus(ref, reload) {
    const b = (adminState.bookings || []).find(x => x.ref === ref);
    const currentStatus = b ? b.status : '';
    const currentEta = (b && b.eta) || '';
    const options = STATUS_FLOW.map(s =>
      '<option value="' + esc(s.key) + '"' + (s.key === currentStatus ? ' selected' : '') + '>' + esc(s.label) + '</option>'
    ).join('') + '<option value="REJECTED"' + (currentStatus === 'REJECTED' ? ' selected' : '') + '>Rejected</option>';

    openModal(
      'Update Shipment Status — ' + ref,
      '<div class="form-group" style="margin-bottom:14px;"><label>New Status</label><select id="statusSelect">' + options + '</select></div>' +
      '<div class="form-group" style="margin-bottom:14px;"><label>Estimated Delivery Date (optional)</label><input type="date" id="etaInput" value="' + esc(currentEta) + '"></div>' +
      '<div class="form-group"><label>Status Remark / Location Note (optional)</label><input type="text" id="statusNoteInput" placeholder="e.g. Crossed Surat toll plaza"></div>',
      async () => {
        try {
          await apiFetch('/api/admin/bookings/' + encodeURIComponent(ref) + '/status', {
            method: 'PATCH',
            body: {
              status: $('#statusSelect').value,
              eta: $('#etaInput').value,
              note: $('#statusNoteInput').value.trim()
            }
          });
          await reload();
          toast('Shipment status updated for ' + ref + '!', 'success');
        } catch (err) {
          toast(err.message || 'Status update failed.', 'error');
          return false;
        }
      },
      'Update Status'
    );
  }

  function viewBooking(ref) {
    const b = (adminState.bookings || []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const row = (k, v) => '<div class="summary-item"><small>' + esc(k) + '</small><b>' + esc(v || '—') + '</b></div>';
    openModal(
      'Booking Details — ' + ref,
      (b.sample ? '<span class="demo-tag">Sample data</span>' : '') +
      '<div class="summary-grid" style="margin-top:14px;">' +
        row('Customer', b.customer.name + (b.customer.company ? ' (' + b.customer.company + ')' : '')) +
        row('Mobile', b.customer.mobile) +
        row('Email', b.customer.email) +
        row('GST', b.customer.gst) +
        row('Pickup', b.pickup.address + ', ' + b.pickup.city + ', ' + b.pickup.state + ' – ' + b.pickup.pin) +
        row('Delivery', b.delivery.address + ', ' + b.delivery.city + ', ' + b.delivery.state + ' – ' + b.delivery.pin) +
        row('Pickup Date', fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + b.pickup.time : '')) +
        row('Vehicle', b.vehicle.type + (b.vehicle.capacity ? ' · ' + b.vehicle.capacity : '')) +
        row('Assigned Vehicle', b.vehicleReg) +
        row('Estimated Delivery', b.eta ? fmtDate(b.eta) : '—') +
        row('Material', b.goods.material) +
        row('Weight', b.goods.weight + ' T') +
        row('Packages', b.goods.packages) +
        row('Handling', b.goods.handling) +
        row('Payment Preference', b.payment.freight + ' · Advance: ' + b.payment.advance) +
        row('Submitted', fmtDateTime(b.createdAt)) +
      '</div>' +
      '<p style="margin-top:16px;"><span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span></p>' +
      '<h4 style="margin:18px 0 8px;font-size:16px;">Status Audit History</h4>' +
      '<ul style="font-size:13.5px;">' + (b.history || []).map(h =>
        '<li style="padding:6px 0;border-bottom:1px solid #E3E8F0;"><b>' + esc(fmtDateTime(h.at)) + '</b> — ' + esc(h.status) + (h.note ? ' <span style="color:#71809A;">(' + esc(h.note) + ')</span>' : '') + '</li>'
      ).join('') + '</ul>'
    );
  }

  function editVehicle(id) {
    const v = (adminState.vehicles || []).find(x => x.id === id);
    if (!v) return;
    const form = $('#vehicleForm');
    form.vId.value = v.id;
    form.vReg.value = v.reg;
    form.vType.value = v.type;
    form.vCapacity.value = v.capacity;
    form.vDriver.value = v.driver;
    form.vContact.value = v.contact;
    form.vAvailability.value = v.availability;
    form.vLocation.value = v.location || '';
    form.vAssigned.value = v.assigned || '';
    $('#vehicleFormTitle').textContent = 'Edit Vehicle — ' + v.reg;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteVehicle(id, reload) {
    const v = (adminState.vehicles || []).find(x => x.id === id);
    openModal(
      'Remove Fleet Vehicle',
      '<p>Remove vehicle <b>' + esc(v ? v.reg : id) + '</b> from the fleet database?</p>',
      async () => {
        try {
          await apiFetch('/api/admin/vehicles/' + encodeURIComponent(id), { method: 'DELETE' });
          await reload();
          toast('Vehicle removed from fleet.', 'info');
        } catch (err) {
          toast(err.message || 'Could not delete vehicle.', 'error');
          return false;
        }
      },
      'Remove Vehicle'
    );
  }

  function printBooking(ref) {
    const b = (adminState.bookings || []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const row = (k, v) => '<tr><th style="text-align:left;padding:7px 10px;width:38%;background:#F4F6F8;">' + esc(k) + '</th><td style="padding:7px 10px;">' + esc(v || '—') + '</td></tr>';
    const w = window.open('', '_blank');
    if (!w) { toast('Pop-up blocked. Allow pop-ups to print.', 'error'); return; }
    w.document.write(
      '<html><head><title>' + esc(b.ref) + ' — RP TRANSPORT COMPANY</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#111;padding:34px;max-width:760px;margin:auto;}' +
      'h1{color:#B30000;margin:0 0 4px;font-size:26px;}h2{background:#0A2342;color:#fff;padding:14px 18px;font-size:18px;margin:0 0 18px;}' +
      'table{width:100%;border-collapse:collapse;margin-top:14px;}td,th{border:1px solid #bbb;}' +
      '.note{margin-top:22px;padding:12px;background:#FFF4DC;border:1px dashed #E4C36A;font-size:13px;}' +
      '.pill{display:inline-block;padding:4px 12px;background:#F4F6F8;border-radius:20px;font-size:12px;font-weight:bold;}</style></head><body>' +
      '<h2>RP TRANSPORT COMPANY (RPTC) — WE DELIVER SAFE.</h2>' +
      '<h1>Booking Slip: ' + esc(b.ref) + '</h1>' +
      '<span class="pill">' + esc(b.status) + '</span>' +
      '<table>' +
        row('Customer', b.customer.name + (b.customer.company ? ' (' + b.customer.company + ')' : '')) +
        row('Mobile', b.customer.mobile) + row('Email', b.customer.email) + row('GST', b.customer.gst) +
        row('Pickup', b.pickup.address + ', ' + b.pickup.city + ', ' + b.pickup.state + ' – ' + b.pickup.pin) +
        row('Delivery', b.delivery.address + ', ' + b.delivery.city + ', ' + b.delivery.state + ' – ' + b.delivery.pin) +
        row('Pickup Date', fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + b.pickup.time : '')) +
        row('Vehicle', b.vehicle.type + (b.vehicle.capacity ? ' · ' + b.vehicle.capacity : '')) +
        row('Assigned Vehicle', b.vehicleReg) +
        row('Estimated Delivery', b.eta ? fmtDate(b.eta) : '—') +
        row('Goods', b.goods.material + ' · ' + b.goods.weight + ' T · ' + (b.goods.packages || '—') + ' packages') +
        row('Handling', b.goods.handling) +
        row('Payment', b.payment.freight + ' · Advance: ' + b.payment.advance) +
        row('Submitted', fmtDateTime(b.createdAt)) +
      '</table>' +
      '<div class="note"><b>Contact RP TRANSPORT COMPANY:</b> ' + COMPANY.phone1 + ' / ' + COMPANY.phone2 + ' · ' + COMPANY.email + '<br>' + COMPANY.address + '</div>' +
      '</body></html>'
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 450);
  }

  /* ---------- 13. Initialisation ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    initNav();
    initReveal();
    initMisc();
    await syncCurrentUser();
    initHomePage();
    initBookingPage();
    initQuotation();
    initTrackingPage();
    initContactPage();
    await initAuthPage();
    await initAdminPage();
  });
})();
