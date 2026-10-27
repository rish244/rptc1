/* ==========================================================================
   RP TRANSPORT COMPANY (RPTC) — Transport Management System
   Shared frontend JavaScript (vanilla JS, no frameworks).

   IMPORTANT: This is a FRONTEND DEMONSTRATION.
   - All data is stored in the browser's LocalStorage (browser-specific,
     not shared between users or devices).
   - Availability checks, quotations, approvals and tracking statuses are
     SIMULATED for demonstration. Real multi-user booking requires a backend
     API, a database, secure authentication and server-side validation.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Utility helpers & company details ---------- */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  // Form field helpers (avoid relying on browser-only named-property access)
  const field = (form, name) => (form && form.elements ? form.elements.namedItem(name) : null);
  const fval = (form, name) => { const el = field(form, name); return el ? el.value : ''; };
  const setf = (form, name, value) => { const el = field(form, name); if (el) el.value = value == null ? '' : value; };

  const COMPANY = {
    name: 'RP TRANSPORT COMPANY (RPTC)',
    tagline: 'WE DELIVER SAFE.',
    phone1: '+91 88283 83122',
    phone1Raw: '+918828383122',
    phone2: '+91 77387 33177',
    phone2Raw: '+917738733177',
    email: 'rptransportcompany28@gmail.com',
    whatsapp: '918828383122', // NOTE: verify the WhatsApp-registered number before publishing
    address: 'D 5103, Bima Complex, Near Steel Market, Kalamboli, Navi Mumbai – 410218, Maharashtra, India'
  };
  const WA_MSG_DEFAULT = 'Hello RP TRANSPORT COMPANY, I would like to enquire about truck booking and freight charges.';
  const waLink = (msg) => 'https://wa.me/' + COMPANY.whatsapp + '?text=' + encodeURIComponent(msg || WA_MSG_DEFAULT);

  /* ---------- 2. LocalStorage helpers + demo admin / rate defaults ---------- */
  const KEYS = {
    bookings:     'rptc_bookings',
    quotes:       'rptc_quotes',
    vehicles:     'rptc_vehicles',
    users:        'rptc_users',
    messages:     'rptc_messages',
    session:      'rptc_session',
    adminProfile: 'rptc_admin_profile',
    adminCreds:   'rptc_admin_credentials',
    adminSession: 'rptc_admin_session',
    rates:        'rptc_rates'
  };
  const getData = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  };
  const setData = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
  const money = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const initials = (name) => String(name || 'RPTC').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

  /* DEMO administrator account. Plain-text credentials in LocalStorage are
     NOT secure — see the security notices on the admin pages. Production
     requires a backend with hashed passwords, sessions and role checks. */
  const ADMIN_DEMO = {
    email: 'admin@rptc.in',
    password: 'Admin@123',
    profile: {
      name: 'RPTC Admin',
      designation: 'Transport Operations Manager',
      email: 'admin@rptc.in',
      phone: '8828383122',
      altPhone: '7738733177',
      office: 'D 5103, Bima Complex, Near Steel Market, Kalamboli, Navi Mumbai – 410218',
      role: 'Transport Administrator (Demo)',
      joinedAt: '2026-01-01T09:00:00',
      lastLogin: null
    }
  };

  /* Indicative rate card. Clearly labelled as demo values: real freight is
     always confirmed by the RPTC office after route verification. */
  const DEFAULT_RATES = {
    updatedAt: null,
    docFee: 300,
    gstPct: 5,
    detentionPerDay: 1500,
    trucks: [
      { type: 'Light Commercial Vehicle', capacity: 'Up to 3.5 T', base: 2500, perKm: 22, loading: 500,  note: 'City & short-haul deliveries' },
      { type: 'Open Body Truck',          capacity: 'Up to 9 T',   base: 4500, perKm: 34, loading: 1200, note: 'Bulk & building material' },
      { type: 'Medium Commercial Vehicle', capacity: 'Up to 16 T', base: 6000, perKm: 42, loading: 1500, note: 'Industrial & FMCG loads' },
      { type: 'Container Truck',          capacity: '20–32 ft',    base: 7500, perKm: 48, loading: 1800, note: 'Sealed cargo & exports' },
      { type: 'Heavy Commercial Vehicle', capacity: '16–25 T',     base: 9500, perKm: 56, loading: 2500, note: 'Heavy & oversize loads' }
    ]
  };

  function getRates() {
    const r = getData(KEYS.rates, null);
    if (!r || !Array.isArray(r.trucks)) return clone(DEFAULT_RATES);
    return {
      updatedAt: r.updatedAt || null,
      docFee: Number(r.docFee) || 0,
      gstPct: Number(r.gstPct) || 0,
      detentionPerDay: Number(r.detentionPerDay) || 0,
      trucks: r.trucks.map(t => ({
        type: t.type,
        capacity: t.capacity || '—',
        base: Number(t.base) || 0,
        perKm: Number(t.perKm) || 0,
        loading: Number(t.loading) || 0,
        note: t.note || ''
      }))
    };
  }
  const getAdminProfile = () => getData(KEYS.adminProfile, clone(ADMIN_DEMO.profile));
  const getAdminCreds   = () => getData(KEYS.adminCreds, { email: ADMIN_DEMO.email, password: ADMIN_DEMO.password });
  const getAdminSession = () => getData(KEYS.adminSession, null);
  const isAdminLoggedIn = () => { const s = getAdminSession(); return !!(s && s.email); };

  const PAYMENT_STATUSES = ['PENDING', 'ADVANCE RECEIVED', 'FULLY PAID'];
  function paymentLabel(status) {
    if (status === 'ADVANCE RECEIVED') return 'Advance received';
    if (status === 'FULLY PAID') return 'Fully paid';
    if (status === 'CANCELLED') return 'Not applicable';
    return 'Payment pending';
  }
  function paymentPill(status) {
    if (status === 'ADVANCE RECEIVED') return 'pill-approved';
    if (status === 'FULLY PAID') return 'pill-delivered';
    return 'pill-pending';
  }
  function quotePill(status) {
    if (status === 'RATE SENT') return 'pill-approved';
    if (status === 'CONVERTED TO BOOKING') return 'pill-delivered';
    return 'pill-pending';
  }
  function bookingFreight(b) {
    return (b && b.freight && Number(b.freight.amount) > 0) ? Number(b.freight.amount) : null;
  }
  function canCustomerCancel(b) {
    return ['PENDING COMPANY CONFIRMATION', 'APPROVED', 'VEHICLE ASSIGNED'].indexOf(b.status) >= 0;
  }
  function bookingDocs(b) {
    const d = (b && b.docs) || {};
    return {
      ewb: d.ewb || '',
      invoiceNo: d.invoiceNo || '',
      invoiceValue: d.invoiceValue || '',
      remarks: d.remarks || ''
    };
  }
  function accountName(b) {
    return (b && b.customer && b.customer.name) || 'Customer';
  }
  function dispatchBookingsChanged() {
    document.dispatchEvent(new CustomEvent('rptc:bookings-changed'));
  }
  function dispatchQuotesChanged() {
    document.dispatchEvent(new CustomEvent('rptc:quotes-changed'));
  }

  /* ---------- 3. Booking status model ---------- */
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
      case 'DELIVERED':                    return 'pill-delivered';
      case 'REJECTED':                     return 'pill-rejected';
      case 'CANCELLED':                    return 'pill-cancelled';
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
  const nowISO = () => new Date().toISOString();

  /* ---------- 4. Reference number generators ---------- */
  function genBookingRef() {
    const year = new Date().getFullYear();
    let max = 10000;
    getData(KEYS.bookings, []).forEach(b => {
      const m = /RPTC-(\d{4})-(\d+)/.exec(b.ref || '');
      if (m && +m[1] === year && +m[2] > max) max = +m[2];
    });
    return 'RPTC-' + year + '-' + (max + 1);
  }
  function genQuoteRef() {
    const year = new Date().getFullYear();
    let max = 0;
    getData(KEYS.quotes, []).forEach(q => {
      const m = /RPTC-Q-(\d{4})-(\d+)/.exec(q.ref || '');
      if (m && +m[1] === year && +m[2] > max) max = +m[2];
    });
    return 'RPTC-Q-' + year + '-' + String(max + 1).padStart(4, '0');
  }

  /* ---------- 5. Seed demonstration data (clearly labelled) ---------- */
  function seedDemoData() {
    if (!localStorage.getItem(KEYS.bookings)) {
      setData(KEYS.bookings, [
        {
          ref: 'RPTC-2026-10001', sample: true, createdAt: '2026-01-05T09:30:00',
          customer: { name: 'Demo Customer — Mumbai', company: 'Sample Trading Co.', mobile: '9820000001', email: 'demo@example.com', gst: '' },
          pickup:  { address: 'APMC Market, Vashi', city: 'Navi Mumbai', state: 'Maharashtra', pin: '400703', date: '2026-12-12', time: '09:00 – 12:00' },
          delivery:{ address: 'Azadpur Mandi', city: 'Delhi', state: 'Delhi', pin: '110033' },
          goods:   { material: 'Onions (Agricultural Produce)', category: 'Perishable', weight: '9', packages: '450', dimensions: '', handling: 'Keep covered, avoid stacking heavy load on top.' },
          vehicle: { type: 'Open Body Truck', capacity: '9 T' },
          payment: { freight: 'Sender Pays', advance: 'Yes', instructions: 'Sample booking request for demonstration.' },
          paymentStatus: 'PENDING',
          freight: null, driver: null, docs: { ewb: '', invoiceNo: '', invoiceValue: '', remarks: '' },
          status: 'PENDING COMPANY CONFIRMATION', vehicleReg: null,
          history: [{ status: 'PENDING COMPANY CONFIRMATION', at: '2026-01-05T09:30:00', note: 'Booking request received (sample data)' }]
        },
        {
          ref: 'RPTC-2026-10002', sample: true, createdAt: '2026-01-08T11:00:00',
          customer: { name: 'Demo Customer — Pune', company: '', mobile: '9820000002', email: 'demo2@example.com', gst: '' },
          pickup:  { address: 'Chakan Industrial Area', city: 'Pune', state: 'Maharashtra', pin: '410501', date: '2026-12-08', time: '06:00 – 09:00' },
          delivery:{ address: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pin: '600040' },
          goods:   { material: 'Automobile Parts', category: 'General', weight: '7', packages: '32', dimensions: '', handling: '' },
          vehicle: { type: 'Container Truck', capacity: '7.5 T (20 ft)' },
          payment: { freight: 'Receiver Pays', advance: 'No', instructions: '' },
          paymentStatus: 'ADVANCE RECEIVED',
          freight: { amount: 28500, note: 'Sample rate shared by the RPTC office — toll and loading extra.', by: 'RPTC Admin', at: '2026-01-08T15:20:00', validTill: '2026-01-20' },
          driver: { name: 'Ramesh Patil (Sample)', contact: '9000000002' },
          docs: { ewb: 'EWB-SAMPLE-10002', invoiceNo: 'INV/SAMPLE/002', invoiceValue: '185000', remarks: 'Sample documents for demonstration.' },
          status: 'IN TRANSIT', vehicleReg: 'MH-48-CD-2002 (Sample)',
          history: [
            { status: 'PENDING COMPANY CONFIRMATION', at: '2026-01-08T11:00:00', note: 'Booking request received (sample data)' },
            { status: 'APPROVED', at: '2026-01-08T15:20:00', note: 'Approved by RPTC team (sample data)' },
            { status: 'VEHICLE ASSIGNED', at: '2026-01-09T08:00:00', note: 'Vehicle assigned (sample data)' },
            { status: 'PICKED UP', at: '2026-12-08T07:10:00', note: 'Goods picked up (sample data)' },
            { status: 'IN TRANSIT', at: '2026-12-08T09:00:00', note: 'Shipment in transit (sample data)' }
          ]
        },
        {
          ref: 'RPTC-2026-10003', sample: true, createdAt: '2026-01-10T16:45:00',
          customer: { name: 'Demo Customer — Nashik', company: 'Sample Industries', mobile: '9820000003', email: '', gst: '' },
          pickup:  { address: 'MIDC Satpur', city: 'Nashik', state: 'Maharashtra', pin: '422007', date: '2026-12-15', time: 'Flexible' },
          delivery:{ address: 'Butibori MIDC', city: 'Nagpur', state: 'Maharashtra', pin: '441122' },
          goods:   { material: 'Steel Coils', category: 'General', weight: '16', packages: '6', dimensions: '', handling: 'Use crane for loading.' },
          vehicle: { type: 'Heavy Commercial Vehicle', capacity: '16 T' },
          payment: { freight: 'Sender Pays', advance: 'Yes', instructions: '' },
          paymentStatus: 'PENDING',
          freight: { amount: 41200, note: 'Sample rate for steel coils, Nashik → Nagpur. Crane loading extra.', by: 'RPTC Admin', at: '2026-01-11T10:05:00', validTill: '2026-01-18' },
          driver: null, docs: { ewb: '', invoiceNo: '', invoiceValue: '', remarks: '' },
          status: 'APPROVED', vehicleReg: null,
          history: [
            { status: 'PENDING COMPANY CONFIRMATION', at: '2026-01-10T16:45:00', note: 'Booking request received (sample data)' },
            { status: 'APPROVED', at: '2026-01-11T10:00:00', note: 'Approved by RPTC team (sample data)' }
          ]
        }
      ]);
    }
    if (!localStorage.getItem(KEYS.vehicles)) {
      setData(KEYS.vehicles, [
        { id: 'V-001', reg: 'MH-48-AB-1001 (Sample)', type: 'Open Body Truck', capacity: '9 T', driver: 'Suresh Kumar (Sample)', contact: '9000000001', availability: 'Available', location: 'Kalamboli, Navi Mumbai', assigned: '' },
        { id: 'V-002', reg: 'MH-48-CD-2002 (Sample)', type: 'Container Truck', capacity: '7.5 T (20 ft)', driver: 'Ramesh Patil (Sample)', contact: '9000000002', availability: 'On Trip', location: 'Chennai (en route)', assigned: 'RPTC-2026-10002' },
        { id: 'V-003', reg: 'MH-48-EF-3003 (Sample)', type: 'Light Commercial Vehicle', capacity: '3.5 T', driver: 'Anil Shinde (Sample)', contact: '9000000003', availability: 'Available', location: 'Kalamboli, Navi Mumbai', assigned: '' },
        { id: 'V-004', reg: 'MH-48-GH-4004 (Sample)', type: 'Heavy Commercial Vehicle', capacity: '16 T (Multi-axle)', driver: 'Vijay More (Sample)', contact: '9000000004', availability: 'Maintenance', location: 'Workshop, Navi Mumbai', assigned: '' }
      ]);
    }
    if (!localStorage.getItem(KEYS.quotes)) {
      setData(KEYS.quotes, [
        {
          ref: 'RPTC-Q-2026-0001', sample: true, createdAt: '2026-01-06T10:00:00',
          pickupCity: 'Mumbai', deliveryCity: 'Jaipur', material: 'FMCG Goods', weight: '5',
          truck: 'Open Body Truck', date: '2026-12-20', contact: '9820000009', email: '',
          status: 'AWAITING QUOTATION',
          estimate: { low: 16500, high: 22500, illustrative: true }
        },
        {
          ref: 'RPTC-Q-2026-0002', sample: true, createdAt: '2026-01-12T12:15:00',
          pickupCity: 'Pune', deliveryCity: 'Hyderabad', material: 'Machinery', weight: '12',
          truck: 'Heavy Commercial Vehicle', date: '2026-12-18', contact: '9820000010', email: '',
          status: 'RATE SENT',
          estimate: { low: 48000, high: 66000, illustrative: true },
          rate: { amount: 46500, note: 'Sample rate valid for 7 days. Toll, loading and detention extra.', by: 'RPTC Admin', at: '2026-01-12T17:00:00', validTill: '2026-01-19' }
        }
      ]);
    }
    if (!localStorage.getItem(KEYS.adminProfile)) setData(KEYS.adminProfile, clone(ADMIN_DEMO.profile));
    if (!localStorage.getItem(KEYS.adminCreds)) setData(KEYS.adminCreds, { email: ADMIN_DEMO.email, password: ADMIN_DEMO.password });
    if (!localStorage.getItem(KEYS.rates)) setData(KEYS.rates, clone(DEFAULT_RATES));
  }

  /* ---------- 6. Toast notifications ---------- */
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
    const titles  = { success: 'Success', error: 'Attention', info: 'Information' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<i class="fa-solid ' + icons[type] + '"></i><div><b>' + titles[type] + '</b><span>' + message + '</span></div>';
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 380);
    }, 4200);
  }

  /* ---------- 7. Modal dialog ---------- */
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
          '<button class="btn btn-red btn-sm" id="modalConfirm">' + (confirmLabel || 'Confirm') + '</button></div>' +
        '</div>';
      document.body.appendChild(mb);
    }
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    mb.classList.add('show');
    document.body.classList.add('no-scroll');
    $('#modalClose').onclick = $('#modalCancel').onclick = closeModal;
    mb.onclick = (e) => { if (e.target === mb) closeModal(); };
    $('#modalConfirm').onclick = () => { if (!onConfirm || onConfirm() !== false) closeModal(); };
  }
  function closeModal() {
    const mb = $('#modalBackdrop');
    if (mb) mb.classList.remove('show');
    document.body.classList.remove('no-scroll');
  }

  /* ---------- 8. Navigation (sticky bar + mobile hamburger) ---------- */
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
    // Highlight the current page in the menu
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('#navLinks a[data-page]').forEach(a => {
      if ((a.dataset.page || '').toLowerCase() === page) a.classList.add('active');
    });
  }

  /* ---------- 9. Scroll reveal animations ---------- */
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

  /* ---------- 10. Misc: min dates, back-to-top, footer year, WhatsApp links ---------- */
  function initMisc() {
    // Prevent selecting past dates in all date inputs
    const today = new Date().toISOString().split('T')[0];
    $$('input[type="date"]').forEach(i => { if (!i.min) i.min = today; });
    // Back to top button
    const backTop = $('#backTop');
    if (backTop) {
      window.addEventListener('scroll', () => backTop.classList.toggle('show', window.scrollY > 500));
      backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    // Current year in footer
    $$('.year').forEach(el => el.textContent = new Date().getFullYear());
    // WhatsApp links (default pre-filled message; data-msg overrides)
    $$('.wa-link').forEach(a => {
      if (!a.getAttribute('href') || a.getAttribute('href').indexOf('wa.me') === -1) {
        a.href = waLink(a.dataset.msg || WA_MSG_DEFAULT);
      }
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- 11. Form validation helpers ---------- */
  function markInvalid(input, msg) {
    const g = input.closest('.form-group');
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
    });
    if (first) first.focus();
    return ok;
  }
  // Clear error styling as the user types
  document.addEventListener('input', e => {
    const g = e.target.closest && e.target.closest('.form-group.invalid');
    if (g) g.classList.remove('invalid');
  });

  /* ---------- 12. HOME PAGE: quick booking + simulated availability ---------- */
  const TRUCK_SUGGESTIONS = {
    'Open Body Truck': [
      { name: 'Open Body Truck — 9 T', cap: 'Up to 9 tons · open body', icon: 'fa-truck' },
      { name: 'Open Body Truck — 16 T (Multi-axle)', cap: 'Up to 16 tons · heavy open body', icon: 'fa-truck-moving' },
      { name: 'Open Body Truck — 7.5 T', cap: 'Up to 7.5 tons · city-friendly', icon: 'fa-truck-fast' }
    ],
    'Container Truck': [
      { name: 'Container Truck — 20 ft (7.5 T)', cap: 'Sealed 20 ft container', icon: 'fa-box-open' },
      { name: 'Container Truck — 24 ft (9 T)', cap: 'Sealed 24 ft container', icon: 'fa-container-storage' },
      { name: 'Container Truck — 32 ft Multi-axle', cap: 'Up to 16 tons · sealed', icon: 'fa-trailer' }
    ],
    'Light Commercial Vehicle': [
      { name: 'LCV — 3.5 T (Tata 407 / Pickup)', cap: 'Up to 3.5 tons · closed van', icon: 'fa-van-shuttle' },
      { name: 'LCV — 2 T (Pickup / Mini Truck)', cap: 'Up to 2 tons · quick city trips', icon: 'fa-truck-pickup' }
    ],
    'Medium Commercial Vehicle': [
      { name: 'MCV — 9 T (12 ft)', cap: 'Up to 9 tons · open/closed body', icon: 'fa-truck' },
      { name: 'MCV — 16 T (20 ft)', cap: 'Up to 16 tons · single axle', icon: 'fa-truck-moving' }
    ],
    'Heavy Commercial Vehicle': [
      { name: 'HCV — 16 T (Multi-axle)', cap: 'Up to 16 tons · heavy load', icon: 'fa-trailer' },
      { name: 'HCV — 25 T (Multi-axle)', cap: 'Up to 25 tons · industrial load', icon: 'fa-truck-monster' }
    ]
  };

  function initHomePage() {
    const form = $('#quickBookForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const btn = $('#quickBookBtn');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking availability…';
      // Simulated availability check (demo only — NOT a real fleet check)
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = original;
        const d = Object.fromEntries(new FormData(form).entries());
        renderAvailability(d);
      }, 1400);
    });
  }

  function renderAvailability(d) {
    const panel = $('#availabilityResult');
    $('#avRoute').textContent = d.pickup + '  →  ' + d.delivery;
    $('#avMeta').textContent = 'Pickup: ' + fmtDate(d.pickupDate) + '  ·  Truck: ' + d.truck + '  ·  Weight: ' + d.weight + ' tons  ·  Material: ' + d.material;
    const list = $('#avList');
    const suggestions = TRUCK_SUGGESTIONS[d.truck] || TRUCK_SUGGESTIONS['Open Body Truck'];
    list.innerHTML = suggestions.map(s =>
      '<div class="avail-item">' +
        '<div class="avail-icon"><i class="fa-solid ' + s.icon + '"></i></div>' +
        '<div class="avail-info"><b>' + s.name + '</b><span>' + s.cap + ' · Indicative response from RPTC team within 24 hours</span></div>' +
        '<span class="pill pill-pending">Demo check</span>' +
      '</div>'
    ).join('');
    // Prefill the full booking page via query string
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
    toast('Simulated availability generated. This is a demonstration, not a real fleet check.', 'info');
  }

  /* ---------- 13. BOOKING PAGE: full booking form ---------- */
  function initBookingPage() {
    const form = $('#bookingForm');
    if (!form) return;

    // Prefill from query string (coming from the home page quick booking)
    const q = new URLSearchParams(location.search);
    const map = { pickup: 'pCity', delivery: 'dCity', date: 'pDate', truck: 'vType', weight: 'gWeight', material: 'gMaterial', name: 'cName', mobile: 'cMobile' };
    Object.keys(map).forEach(k => {
      if (q.get(k)) {
        const el = form.querySelector('[name="' + map[k] + '"]');
        if (el) el.value = q.get(k);
      }
    });
    // Prefill pickup/delivery city fields also from the dedicated fields
    if (q.get('pickup')) { const pa = form.querySelector('[name="pAddress"]'); if (pa && !pa.value) pa.value = q.get('pickup'); }
    if (q.get('delivery')) { const da = form.querySelector('[name="dAddress"]'); if (da && !da.value) da.value = q.get('delivery'); }

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const v = (n) => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const session = getData(KEYS.session, null);
      const booking = {
        ref: genBookingRef(),
        sample: false,
        createdAt: nowISO(),
        source: 'Customer website',
        accountEmail: session && session.email ? session.email : '',
        customer: { name: v('cName'), company: v('cCompany'), mobile: v('cMobile'), email: v('cEmail'), gst: v('cGst') },
        pickup:   { address: v('pAddress'), city: v('pCity'), state: v('pState'), pin: v('pPin'), date: v('pDate'), time: v('pTime') },
        delivery: { address: v('dAddress'), city: v('dCity'), state: v('dState'), pin: v('dPin'), consignee: v('dConsignee'), consigneeMobile: v('dConsigneeMobile') },
        goods:    { material: v('gMaterial'), category: v('gCategory'), weight: v('gWeight'), packages: v('gPackages'), dimensions: v('gDimensions'), handling: v('gHandling') },
        vehicle:  { type: v('vType'), capacity: v('vCapacity') },
        payment:  { freight: v('payFreight'), advance: v('payAdvance'), instructions: v('payInstructions') },
        paymentStatus: 'PENDING',
        freight: null,
        driver: null,
        docs: { ewb: v('docEwb'), invoiceNo: v('docInvoiceNo'), invoiceValue: v('docInvoiceValue'), remarks: '' },
        status: 'PENDING COMPANY CONFIRMATION',
        vehicleReg: null,
        history: [{ status: 'PENDING COMPANY CONFIRMATION', at: nowISO(), note: 'Booking request received' }]
      };
      const bookings = getData(KEYS.bookings, []);
      bookings.push(booking);
      setData(KEYS.bookings, bookings);
      renderBookingSummary(booking);
      toast('Booking request ' + booking.ref + ' submitted successfully.', 'success');
      form.reset();
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

  /* ---------- 14. FREIGHT QUOTATION (booking.html#freight-quote) ---------- */
  function initQuotation() {
    const form = $('#quoteForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const v = (n) => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      // Illustrative sample estimate — NOT a real quotation (no verified pricing rules)
      const base = {
        'Light Commercial Vehicle': 6000,
        'Open Body Truck': 12000,
        'Medium Commercial Vehicle': 15000,
        'Container Truck': 18000,
        'Heavy Commercial Vehicle': 25000
      };
      const b = base[v('qTruck')] || 12000;
      const total = b + (parseFloat(v('qWeight')) || 1) * 900;
      const estimate = {
        low: Math.round(total * 0.9 / 500) * 500,
        high: Math.round(total * 1.25 / 500) * 500,
        illustrative: true
      };
      const session = getData(KEYS.session, null);
      const quote = {
        ref: genQuoteRef(),
        sample: false,
        createdAt: nowISO(),
        pickupCity: v('qPickup'), deliveryCity: v('qDelivery'), material: v('qMaterial'),
        weight: v('qWeight'), truck: v('qTruck'), date: v('qDate'), contact: v('qContact'),
        email: v('qEmail') || (session && session.email ? session.email : ''),
        status: 'AWAITING QUOTATION',
        estimate: estimate
      };
      const quotes = getData(KEYS.quotes, []);
      quotes.push(quote);
      setData(KEYS.quotes, quotes);
      dispatchQuotesChanged();
      renderQuoteSummary(quote);
      toast('Freight quotation request ' + quote.ref + ' submitted.', 'success');
      form.reset();
    });
  }

  function renderQuoteSummary(q) {
    const wrap = $('#quoteSummary');
    $('#qRef').textContent = q.ref;
    const pill = $('#qStatus');
    pill.textContent = q.status;
    pill.className = 'pill pill-pending';
    $('#qRoute').textContent = q.pickupCity + '  →  ' + q.deliveryCity;
    $('#qDetails').textContent = 'Material: ' + q.material + ' · Weight: ' + q.weight + ' T · Truck: ' + q.truck + ' · Pickup: ' + fmtDate(q.date);
    $('#qEstLow').textContent = '₹' + q.estimate.low.toLocaleString('en-IN');
    $('#qEstHigh').textContent = '₹' + q.estimate.high.toLocaleString('en-IN');
    $('#qWhatsapp').href = waLink(
      'Hello RP TRANSPORT COMPANY, I requested a freight quotation ' + q.ref + ' for route ' + q.pickupCity + ' to ' + q.deliveryCity +
      ', ' + q.truck + ', ' + q.weight + ' tons. Please share the final quotation.'
    );
    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 15. TRACKING PAGE ---------- */
  function initTrackingPage() {
    const form = $('#trackingForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const ref = $('#trackRef').value.trim().toUpperCase();
      if (!ref) { toast('Please enter a booking reference number.', 'error'); return; }
      const booking = getData(KEYS.bookings, []).find(b => (b.ref || '').toUpperCase() === ref);
      const wrap = $('#trackingResult');
      if (!booking) {
        $('#trackFound').hidden = true;
        $('#trackNotFound').hidden = false;
        $('#notFoundRef').textContent = ref;
        wrap.hidden = false;
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
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
      if ($('#tFreight')) {
        $('#tFreight').textContent = bookingFreight(booking)
          ? money(bookingFreight(booking)) + ' — rate shared by RPTC'
          : 'Awaiting rate confirmation';
      }
      if ($('#tDriver')) {
        $('#tDriver').textContent = booking.driver && booking.driver.name
          ? booking.driver.name + (booking.driver.contact ? ' · ' + booking.driver.contact : '')
          : (booking.vehicleReg ? 'Driver details will be shared by the office' : 'Vehicle & driver not assigned yet');
      }
      $('#tDate').textContent = fmtDate(booking.pickup.date);
      const last = (booking.history || []).slice(-1)[0];
      $('#tUpdated').textContent = last ? fmtDateTime(last.at) : fmtDateTime(booking.createdAt);
      // Estimated delivery is shown ONLY when available from authorized data
      $('#tEta').textContent = booking.eta ? fmtDate(booking.eta) : 'Will be shared after company confirmation';
      renderTimeline(booking.status);
      wrap.hidden = false;
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Auto-track when arriving from My Bookings (?ref=RPTC-...)
    const presetRef = new URLSearchParams(location.search).get('ref');
    if (presetRef) {
      $('#trackRef').value = presetRef.toUpperCase();
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }

  function renderTimeline(status) {
    const rejected = status === 'REJECTED';
    const cancelled = status === 'CANCELLED';
    const stopped = rejected || cancelled;
    const idx = STATUS_FLOW.findIndex(s => s.key === status);
    const icons = ['fa-clipboard-list', 'fa-circle-check', 'fa-truck', 'fa-box-open', 'fa-route', 'fa-flag-checkered'];
    const wrap = $('#timeline');
    wrap.innerHTML = STATUS_FLOW.map((s, i) => {
      let cls = 'tl-step';
      if (!stopped) {
        if (i < idx) cls += ' done';
        else if (i === idx) cls += ' active';
      }
      const lastHist = !stopped && i <= idx;
      return '<div class="' + cls + '">' +
        '<div class="tl-dot"><i class="fa-solid ' + (i < idx && !stopped ? 'fa-check' : icons[i]) + '"></i></div>' +
        '<h4>' + s.label + '</h4>' +
        '<p>' + (stopped ? '—' : (lastHist ? 'Reached' : 'Pending')) + '</p>' +
      '</div>';
    }).join('');
    const notice = $('#timelineRejected');
    if (notice) {
      notice.hidden = !stopped;
      const msg = notice.querySelector('span');
      if (msg) {
        msg.innerHTML = cancelled
          ? '<b>Booking cancelled.</b> This booking request was cancelled and the shipment will not be dispatched. Please contact RP TRANSPORT COMPANY if this was not expected.'
          : '<b>Booking request rejected.</b> This booking request was not approved. Please contact RP TRANSPORT COMPANY for details.';
      }
    }
  }

  /* ---------- 16. CONTACT PAGE ---------- */
  function initContactPage() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(form)) { toast('Please correct the highlighted fields.', 'error'); return; }
      const v = (n) => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const msg = {
        name: v('ctName'), mobile: v('ctMobile'), email: v('ctEmail'),
        subject: v('ctSubject'), message: v('ctMessage'), at: nowISO()
      };
      const messages = getData(KEYS.messages, []);
      messages.push(msg);
      setData(KEYS.messages, messages); // demo storage only — real delivery needs a backend / form service
      $('#contactSuccess').hidden = false;
      toast('Your message has been recorded (demo).', 'success');
      form.reset();
      $('#contactSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- 17. LOGIN / REGISTRATION (demo only) ---------- */
  function initAuthPage() {
    const loginPanel = $('#loginPanel'), registerPanel = $('#registerPanel');
    if (!loginPanel) return;
    const tabLogin = $('#tabLogin'), tabRegister = $('#tabRegister');
    const showTab = (which) => {
      const isLogin = which === 'login';
      loginPanel.hidden = !isLogin;
      registerPanel.hidden = isLogin;
      tabLogin.classList.toggle('active', isLogin);
      tabRegister.classList.toggle('active', !isLogin);
    };
    tabLogin.addEventListener('click', () => showTab('login'));
    tabRegister.addEventListener('click', () => showTab('register'));

    const sessionBox = $('#authSession'), formsBox = $('#authForms');
    const showSession = (user) => {
      formsBox.hidden = true;
      sessionBox.hidden = false;
      $('#sessionName').textContent = user.name;
    };
    const existing = getData(KEYS.session, null);
    if (existing) showSession(existing);
    $('#logoutBtn') && $('#logoutBtn').addEventListener('click', () => {
      localStorage.removeItem(KEYS.session);
      sessionBox.hidden = true;
      formsBox.hidden = false;
      toast('Logged out (demo session cleared).', 'info');
    });

    $('#registerForm').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      if (!validateForm(form)) return;
      const name = fval(form, 'rName').trim(), email = fval(form, 'rEmail').trim().toLowerCase();
      const mobile = fval(form, 'rMobile').trim(), pass = fval(form, 'rPass');
      const confirm = fval(form, 'rPass2');
      if (pass !== confirm) { markInvalid(form.rPass2, 'Passwords do not match.'); return; }
      const users = getData(KEYS.users, []);
      if (users.some(u => u.email === email)) {
        markInvalid(form.rEmail, 'An account with this email already exists (demo).');
        return;
      }
      // DEMO ONLY: passwords are stored in plain text in LocalStorage.
      // Production MUST use a backend with password hashing, sessions & access control.
      users.push({ name, email, mobile, password: pass, createdAt: nowISO() });
      setData(KEYS.users, users);
      toast('Registration successful. You can now log in (demo).', 'success');
      showTab('login');
      form.reset();
    });

    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      if (!validateForm(form)) return;
      const email = fval(form, 'lEmail').trim().toLowerCase();
      const pass = fval(form, 'lPass');
      const user = getData(KEYS.users, []).find(u => u.email === email && u.password === pass);
      if (!user) {
        markInvalid(form.lPass, 'Invalid email or password (demo).');
        toast('Invalid credentials. Please register first (demo).', 'error');
        return;
      }
      setData(KEYS.session, { name: user.name, email: user.email, mobile: user.mobile || '', at: nowISO() });
      toast('Welcome back, ' + user.name + '!', 'success');
      showSession(user);
    });
  }

  /* ==========================================================================
     18. ADMIN AUTHENTICATION (DEMO ONLY — not secure)
     Separate demo administrator profile, session & login. Production must
     use a backend with hashed passwords, HTTPS sessions and role checks.
     ========================================================================== */
  function adminLogin(email, password) {
    const creds = getAdminCreds();
    if (String(email || '').trim().toLowerCase() !== String(creds.email || '').toLowerCase() ||
        String(password || '') !== String(creds.password || '')) {
      return null;
    }
    const profile = getAdminProfile();
    const session = { email: profile.email, name: profile.name, role: profile.role, at: nowISO() };
    profile.lastLogin = session.at;
    setData(KEYS.adminProfile, profile);
    setData(KEYS.adminSession, session);
    return session;
  }

  function adminLogout() {
    localStorage.removeItem(KEYS.adminSession);
    closeModal();
    toast('Admin session ended (demo).', 'info');
  }

  function fillAdminDemoCreds() {
    const creds = getAdminCreds();
    const profile = getAdminProfile();
    if ($('#adminGateEmail')) $('#adminGateEmail').value = creds.email || profile.email;
    if ($('#adminGatePass')) $('#adminGatePass').value = creds.password;
    if ($('#adminLoginEmail')) $('#adminLoginEmail').value = creds.email || profile.email;
    if ($('#adminLoginPass')) $('#adminLoginPass').value = creds.password;
  }

  /* ---------- 18a. Dedicated admin login page (admin-login.html) ---------- */
  function initAdminLoginPage() {
    const page = $('#adminLoginPage');
    if (!page) return;
    const form = $('#adminLoginForm');
    const body = $('#adminLoginBody');
    const sessionBox = $('#adminLoginSession');

    const showSession = () => {
      const s = getAdminSession();
      if (!s) return false;
      if (body) body.hidden = true;
      if (sessionBox) sessionBox.hidden = false;
      if ($('#adminSessionName')) $('#adminSessionName').textContent = s.name || 'RPTC Admin';
      if ($('#adminSessionEmail')) $('#adminSessionEmail').textContent = s.email || '';
      if ($('#adminSessionAt')) $('#adminSessionAt').textContent = s.at ? fmtDateTime(s.at) : '—';
      return true;
    };
    showSession();

    $('#adminDemoFill') && $('#adminDemoFill').addEventListener('click', () => {
      fillAdminDemoCreds();
      toast('Demo administrator credentials filled in.', 'info');
    });
    $('#adminPassToggle') && $('#adminPassToggle').addEventListener('click', () => {
      const input = $('#adminLoginPass');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      $('#adminPassToggle').innerHTML = '<i class="fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
    });
    $('#adminSessionGo') && $('#adminSessionGo').addEventListener('click', () => { location.href = 'admin.html'; });
    $('#adminSessionLogout') && $('#adminSessionLogout').addEventListener('click', () => {
      adminLogout();
      if (sessionBox) sessionBox.hidden = true;
      if (body) body.hidden = false;
      showAdminTabReset();
    });

    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(form)) return;
      const session = adminLogin(fval(form, 'aEmail'), fval(form, 'aPass'));
      if (!session) {
        markInvalid(form.aPass, 'Invalid administrator email or password (demo).');
        toast('Invalid administrator credentials.', 'error');
        return;
      }
      toast('Welcome, ' + session.name + '. Opening admin dashboard…', 'success');
      showSession();
      setTimeout(() => { location.href = 'admin.html'; }, 900);
    });
  }
  function showAdminTabReset() {
    const form = $('#adminLoginForm');
    if (form) { form.reset(); const g = form.querySelector('#adminLoginPass'); if (g) g.type = 'password'; }
  }

  /* ---------- 18b. Admin dashboard (admin.html) ---------- */
  function initAdminPage() {
    const dash = $('#adminDashboard');
    if (!dash) return;

    // Login gate form (shown when there is no admin session)
    const gateForm = $('#adminGateForm');
    if (gateForm) {
      gateForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!validateForm(gateForm)) return;
        const session = adminLogin(fval(gateForm, 'aEmail'), fval(gateForm, 'aPass'));
        if (!session) {
          markInvalid(gateForm.aPass, 'Invalid administrator email or password (demo).');
          toast('Invalid administrator credentials.', 'error');
          return;
        }
        gateForm.reset();
        toast('Welcome, ' + session.name + '. Admin demo session started.', 'success');
        openAdminDashboard();
      });
    }
    $('#adminGateDemoFill') && $('#adminGateDemoFill').addEventListener('click', () => {
      fillAdminDemoCreds();
      toast('Demo administrator credentials filled in.', 'info');
    });

    if (!isAdminLoggedIn()) {
      showAdminGate();
      return;
    }
    openAdminDashboard();
  }

  function showAdminGate() {
    const gate = $('#adminLoginGate'), content = $('#adminContent');
    if (content) content.hidden = true;
    if (gate) gate.hidden = false;
  }

  function openAdminDashboard() {
    const gate = $('#adminLoginGate'), content = $('#adminContent');
    if (gate) gate.hidden = true;
    if (content) content.hidden = false;
    bindAdminOnce();
    renderAdminProfile();
    renderAdminStats();
    renderBookingsTable();
    renderQuotesTable();
    renderRateCardAdmin();
    renderVehiclesTable();
    renderAdminActivity();
    const hash = (location.hash || '').replace('#', '');
    showAdminTab(hash || 'overview');
  }

  function showAdminTab(name) {
    const valid = ['overview', 'bookings', 'rates', 'new', 'ratecard', 'fleet', 'profile'];
    if (valid.indexOf(name) < 0) name = 'overview';
    $$('#adminTabs [data-tab]').forEach(b => {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('#adminContent [data-panel]').forEach(p => { p.hidden = p.dataset.panel !== name; });
    if (name === 'overview') { renderAdminStats(); renderAdminActivity(); }
    if (name === 'bookings') renderBookingsTable();
    if (name === 'rates') renderQuotesTable();
    if (name === 'ratecard') renderRateCardAdmin();
    if (name === 'fleet') renderVehiclesTable();
    if (name === 'profile') renderAdminProfile();
  }

  function bindAdminOnce() {
    const content = $('#adminContent');
    if (!content || content.dataset.bound === '1') return;
    content.dataset.bound = '1';

    // Tabs
    const tabs = $('#adminTabs');
    tabs && tabs.addEventListener('click', e => {
      const btn = e.target.closest('[data-tab]');
      if (btn) showAdminTab(btn.dataset.tab);
    });
    // Quick action buttons
    $$('[data-goto]', content).forEach(btn => btn.addEventListener('click', () => showAdminTab(btn.dataset.goto)));

    // Logout
    $$('[data-admin-logout]', content).forEach(btn => btn.addEventListener('click', () => {
      adminLogout();
      showAdminGate();
    }));

    // Bookings filters & actions
    $('#bookingFilter') && $('#bookingFilter').addEventListener('change', renderBookingsTable);
    $('#bookingSearch') && $('#bookingSearch').addEventListener('input', renderBookingsTable);
    $('#bookingsTableBody') && $('#bookingsTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const ref = btn.dataset.ref, action = btn.dataset.action;
      if (action === 'view') viewBooking(ref);
      if (action === 'approve') approveBooking(ref);
      if (action === 'reject') rejectBooking(ref);
      if (action === 'assign') assignVehicle(ref);
      if (action === 'status') updateStatus(ref);
      if (action === 'rate') sendBookingRate(ref);
      if (action === 'docs') editBookingDocs(ref);
    });

    // Quotation / rate requests
    $('#quoteFilter') && $('#quoteFilter').addEventListener('change', renderQuotesTable);
    $('#quotesTableBody') && $('#quotesTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-qaction]');
      if (!btn) return;
      const ref = btn.dataset.ref, action = btn.dataset.qaction;
      if (action === 'rate') sendQuoteRate(ref);
      if (action === 'convert') convertQuoteToBooking(ref);
      if (action === 'view') viewQuote(ref);
    });

    // New booking request (created by admin / office)
    const abForm = $('#adminBookingForm');
    abForm && abForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(abForm)) { toast('Please complete the required fields.', 'error'); return; }
      const v = (n) => { const el = abForm.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const admin = getAdminProfile();
      const amount = parseFloat(v('nbFreight')) || 0;
      const approveNow = !!(abForm.querySelector('[name="nbApprove"]') && abForm.querySelector('[name="nbApprove"]').checked);
      const quoteRef = v('nbQuoteRef');
      const booking = {
        ref: genBookingRef(),
        sample: false,
        createdAt: nowISO(),
        source: 'Admin / office request',
        createdBy: admin.name,
        accountEmail: '',
        customer: { name: v('nbName'), company: v('nbCompany'), mobile: v('nbMobile'), email: v('nbEmail'), gst: v('nbGst') },
        pickup: { address: v('nbPickupAddress') || 'Address to be confirmed with customer', city: v('nbPickup'), state: '', pin: '', date: v('nbDate'), time: v('nbTime') || 'Flexible' },
        delivery: { address: v('nbDropAddress') || 'Address to be confirmed with customer', city: v('nbDrop'), state: '', pin: '', consignee: '', consigneeMobile: '' },
        goods: { material: v('nbMaterial'), category: 'General Goods', weight: v('nbWeight'), packages: v('nbPackages'), dimensions: '', handling: v('nbNotes') },
        vehicle: { type: v('nbTruck'), capacity: v('nbCapacity') },
        payment: { freight: v('nbPayMode') || 'To be discussed', advance: v('nbAdvance') || 'To be discussed', instructions: v('nbNotes') },
        paymentStatus: 'PENDING',
        freight: amount ? { amount: amount, note: v('nbRateNote') || 'Rate shared by the RPTC office.', by: admin.name, at: nowISO(), validTill: v('nbValidTill') || '' } : null,
        driver: null,
        docs: { ewb: v('nbEwb'), invoiceNo: v('nbInvoiceNo'), invoiceValue: v('nbInvoiceValue'), remarks: v('nbNotes') },
        status: approveNow ? 'APPROVED' : 'PENDING COMPANY CONFIRMATION',
        vehicleReg: null,
        history: [{
          status: approveNow ? 'APPROVED' : 'PENDING COMPANY CONFIRMATION',
          at: nowISO(),
          note: (approveNow ? 'Booking request created & approved by ' + admin.name : 'Booking request created by ' + admin.name + ' (office)') +
                (quoteRef ? ' · converted from quotation ' + quoteRef : '') + ' (demo admin action)'
        }]
      };
      const bookings = getData(KEYS.bookings, []);
      bookings.push(booking);
      setData(KEYS.bookings, bookings);
      if (quoteRef) {
        const quotes = getData(KEYS.quotes, []);
        const qi = quotes.findIndex(q => q.ref === quoteRef);
        if (qi >= 0) {
          quotes[qi].status = 'CONVERTED TO BOOKING';
          quotes[qi].convertedTo = booking.ref;
          setData(KEYS.quotes, quotes);
          dispatchQuotesChanged();
        }
      }
      dispatchBookingsChanged();
      renderAdminStats();
      renderQuotesTable();
      renderAdminActivity();
      abForm.reset();
      showAdminTab('bookings');
      toast('Booking ' + booking.ref + ' created by admin (demo).', 'success');
      window.scrollTo({ top: $('#adminDashboard').offsetTop - 80, behavior: 'smooth' });
    });
    $('#adminBookingReset') && $('#adminBookingReset').addEventListener('click', () => {
      abForm && abForm.reset();
      toast('Form cleared.', 'info');
    });

    // Rate card editor
    const rcForm = $('#rateCardForm');
    rcForm && rcForm.addEventListener('submit', e => {
      e.preventDefault();
      const rates = getRates();
      const rows = $$('#rateTableBody tr[data-rate-row]');
      const trucks = [];
      let bad = false;
      rows.forEach(row => {
        const type = row.dataset.type;
        const base = parseFloat(row.querySelector('[data-rate-base]').value);
        const perKm = parseFloat(row.querySelector('[data-rate-perkm]').value);
        const loading = parseFloat(row.querySelector('[data-rate-loading]').value);
        if (isNaN(base) || isNaN(perKm) || isNaN(loading) || base < 0 || perKm < 0 || loading < 0) bad = true;
        const existing = rates.trucks.find(t => t.type === type) || {};
        trucks.push({
          type: type, capacity: existing.capacity || '—', note: existing.note || '',
          base: base || 0, perKm: perKm || 0, loading: loading || 0
        });
      });
      const docFee = parseFloat($('#rateDocFee').value) || 0;
      const gstPct = parseFloat($('#rateGst').value) || 0;
      const detention = parseFloat($('#rateDetention').value) || 0;
      if (bad) { toast('Please enter valid non-negative rate values.', 'error'); return; }
      if (gstPct < 0 || gstPct > 28) { toast('GST percentage must be between 0 and 28.', 'error'); return; }
      setData(KEYS.rates, { updatedAt: nowISO(), docFee: docFee, gstPct: gstPct, detentionPerDay: detention, trucks: trucks });
      renderRateCardAdmin();
      toast('Rate card saved (demo). Customers see these rates on the Rate Card page.', 'success');
    });
    $('#rateCardReset') && $('#rateCardReset').addEventListener('click', () => {
      openModal('Reset Rate Card', '<p>Restore the default indicative rate card? Custom rates saved in this browser will be replaced.</p>', () => {
        setData(KEYS.rates, clone(DEFAULT_RATES));
        renderRateCardAdmin();
        toast('Rate card restored to demo defaults.', 'info');
      }, 'Restore Defaults');
    });

    // Admin profile & password
    const pf = $('#adminProfileForm');
    pf && pf.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(pf)) return;
      const old = getAdminProfile();
      const v = (n) => { const el = pf.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const updated = {
        name: v('apName') || old.name,
        designation: v('apDesignation') || old.designation,
        email: v('apEmail') || old.email,
        phone: v('apPhone') || old.phone,
        altPhone: v('apAltPhone'),
        office: v('apOffice') || old.office,
        role: old.role,
        joinedAt: old.joinedAt,
        lastLogin: old.lastLogin
      };
      setData(KEYS.adminProfile, updated);
      const creds = getAdminCreds();
      if (String(creds.email || '').toLowerCase() === String(old.email || '').toLowerCase()) {
        creds.email = updated.email;
        setData(KEYS.adminCreds, creds);
      }
      const session = getAdminSession();
      if (session) { session.name = updated.name; session.email = updated.email; setData(KEYS.adminSession, session); }
      renderAdminProfile();
      toast('Admin profile updated (demo).', 'success');
    });
    const pwd = $('#adminPasswordForm');
    pwd && pwd.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(pwd)) return;
      const creds = getAdminCreds();
      if (fval(pwd, 'currentPass') !== creds.password) {
        markInvalid(field(pwd, 'currentPass'), 'Current password is incorrect.');
        return;
      }
      if (fval(pwd, 'newPass').length < 6) {
        markInvalid(field(pwd, 'newPass'), 'Use at least 6 characters.');
        return;
      }
      if (fval(pwd, 'newPass') !== fval(pwd, 'confirmPass')) {
        markInvalid(field(pwd, 'confirmPass'), 'Passwords do not match.');
        return;
      }
      creds.password = fval(pwd, 'newPass');
      setData(KEYS.adminCreds, creds);
      pwd.reset();
      toast('Password changed for this browser demo. Real systems must hash passwords on a server.', 'success');
    });

    // Demo tools
    $$('[data-export-csv]').forEach(btn => btn.addEventListener('click', exportBookingsCSV));
    $('#resetDemoDataBtn') && $('#resetDemoDataBtn').addEventListener('click', resetDemoData);

    // Fleet form (add / update)
    const vForm = $('#vehicleForm');
    vForm && vForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(vForm)) return;
      const v = (n) => { const el = vForm.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const vehicles = getData(KEYS.vehicles, []);
      const id = fval(vForm, 'vId');
      const vehicle = {
        id: id || ('V-' + Date.now()),
        reg: v('vReg'), type: v('vType'), capacity: v('vCapacity'),
        driver: v('vDriver'), contact: v('vContact'),
        availability: v('vAvailability'), location: v('vLocation'), assigned: v('vAssigned')
      };
      if (id) {
        const i = vehicles.findIndex(x => x.id === id);
        if (i >= 0) vehicles[i] = vehicle;
      } else {
        vehicles.push(vehicle);
      }
      setData(KEYS.vehicles, vehicles);
      renderVehiclesTable();
      vForm.reset();
      setf(vForm, 'vId', '');
      $('#vehicleFormTitle').textContent = 'Add Vehicle (Demo)';
      toast(id ? 'Vehicle updated (demo).' : 'Vehicle added (demo).', 'success');
    });
    $('#vehicleReset') && $('#vehicleReset').addEventListener('click', () => {
      vForm && vForm.reset();
      if (vForm) setf(vForm, 'vId', '');
      $('#vehicleFormTitle').textContent = 'Add Vehicle (Demo)';
    });
    $('#vehiclesTableBody') && $('#vehiclesTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') editVehicle(id);
      if (btn.dataset.action === 'delete') deleteVehicle(id);
    });
  }

  /* ---------- 18c. Admin profile, stats & activity ---------- */
  function renderAdminProfile() {
    const p = getAdminProfile();
    const s = getAdminSession();
    $$('[data-admin-avatar]').forEach(el => el.textContent = initials(p.name));
    $$('[data-admin-name]').forEach(el => el.textContent = p.name || 'RPTC Admin');
    $$('[data-admin-role]').forEach(el => el.textContent = p.designation || p.role || 'Administrator');
    $$('[data-admin-role-tag]').forEach(el => el.textContent = p.role || 'Transport Administrator (Demo)');
    $$('[data-admin-email]').forEach(el => el.textContent = p.email || '—');
    $$('[data-admin-phone]').forEach(el => el.textContent = p.phone || '—');
    $$('[data-admin-altphone]').forEach(el => el.textContent = p.altPhone || '—');
    $$('[data-admin-office]').forEach(el => el.textContent = p.office || '—');
    $$('[data-admin-joined]').forEach(el => el.textContent = p.joinedAt ? fmtDate(p.joinedAt) : '—');
    $$('[data-admin-lastlogin]').forEach(el => el.textContent = p.lastLogin ? fmtDateTime(p.lastLogin) : 'First demo session');
    $$('[data-admin-session-at]').forEach(el => el.textContent = s && s.at ? fmtDateTime(s.at) : '—');

    const f = $('#adminProfileForm');
    if (f) {
      setf(f, 'apName', p.name || '');
      setf(f, 'apDesignation', p.designation || '');
      setf(f, 'apEmail', p.email || '');
      setf(f, 'apPhone', p.phone || '');
      setf(f, 'apAltPhone', p.altPhone || '');
      setf(f, 'apOffice', p.office || '');
    }
  }

  function renderAdminStats() {
    const bookings = getData(KEYS.bookings, []);
    const quotes = getData(KEYS.quotes, []);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stTotal', bookings.length);
    set('stPending', bookings.filter(b => b.status === 'PENDING COMPANY CONFIRMATION').length);
    set('stActive', bookings.filter(b => ['APPROVED', 'VEHICLE ASSIGNED', 'PICKED UP', 'IN TRANSIT'].indexOf(b.status) >= 0).length);
    set('stCompleted', bookings.filter(b => b.status === 'DELIVERED').length);
    set('stRates', quotes.filter(q => q.status === 'AWAITING QUOTATION').length);
    set('stFreight', money(bookings.reduce((sum, b) => sum + (bookingFreight(b) || 0), 0)));
    $$('[data-count="pending"]').forEach(el => el.textContent = bookings.filter(b => b.status === 'PENDING COMPANY CONFIRMATION').length);
    $$('[data-count="quotes"]').forEach(el => el.textContent = quotes.filter(q => q.status === 'AWAITING QUOTATION').length);
  }

  function renderAdminActivity() {
    const list = $('#adminActivityList');
    if (!list) return;
    const bookings = getData(KEYS.bookings, []);
    const quotes = getData(KEYS.quotes, []);
    const iconFor = (status) => {
      if (status === 'DELIVERED') return 'fa-flag-checkered';
      if (status === 'IN TRANSIT') return 'fa-truck-fast';
      if (status === 'APPROVED') return 'fa-circle-check';
      if (status === 'REJECTED' || status === 'CANCELLED') return 'fa-circle-xmark';
      if (status === 'VEHICLE ASSIGNED') return 'fa-truck';
      if (status === 'PICKED UP') return 'fa-box-open';
      return 'fa-clipboard-list';
    };
    const events = [];
    bookings.forEach(b => {
      (b.history || []).forEach(h => events.push({
        at: h.at || b.createdAt,
        icon: iconFor(h.status),
        title: b.ref + ' · ' + (h.status || 'Update'),
        text: h.note || ''
      }));
    });
    quotes.forEach(q => {
      events.push({
        at: q.createdAt, icon: 'fa-file-invoice-dollar',
        title: q.ref + ' · Quotation requested',
        text: q.pickupCity + ' → ' + q.deliveryCity + ' · ' + q.truck
      });
      if (q.rate) events.push({
        at: q.rate.at, icon: 'fa-indian-rupee-sign',
        title: q.ref + ' · Rate ' + money(q.rate.amount) + ' shared',
        text: 'By ' + (q.rate.by || 'RPTC Admin')
      });
    });
    events.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    if (!events.length) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i>No activity yet.</div>';
      return;
    }
    list.innerHTML = events.slice(0, 10).map(ev =>
      '<div class="activity-item">' +
        '<div class="activity-icon"><i class="fa-solid ' + ev.icon + '"></i></div>' +
        '<div><b>' + esc(ev.title) + '</b><small>' + fmtDateTime(ev.at) + (ev.text ? ' — ' + esc(ev.text) : '') + '</small></div>' +
      '</div>'
    ).join('');
  }

  /* ---------- 18d. Booking management ---------- */
  function mutateBookingRecord(ref, mutator) {
    const bookings = getData(KEYS.bookings, []);
    const i = bookings.findIndex(b => b.ref === ref);
    if (i < 0) { toast('Booking not found.', 'error'); return false; }
    mutator(bookings[i], bookings);
    setData(KEYS.bookings, bookings);
    dispatchBookingsChanged();
    return true;
  }

  function updateBooking(ref, mutator) {
    if (!mutateBookingRecord(ref, mutator)) return false;
    renderAdminStats();
    renderBookingsTable();
    renderQuotesTable();
    renderAdminActivity();
    return true;
  }

  function renderBookingsTable() {
    const tbody = $('#bookingsTableBody');
    if (!tbody) return;
    const filter = ($('#bookingFilter') && $('#bookingFilter').value) || 'ALL';
    const term = (($('#bookingSearch') && $('#bookingSearch').value) || '').trim().toLowerCase();
    let bookings = getData(KEYS.bookings, []).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (filter !== 'ALL') bookings = bookings.filter(b => b.status === filter);
    if (term) {
      bookings = bookings.filter(b => (
        (b.ref || '') + ' ' + (b.customer && b.customer.name) + ' ' + (b.customer && b.customer.mobile) + ' ' +
        (b.pickup && b.pickup.city) + ' ' + (b.delivery && b.delivery.city) + ' ' + (b.goods && b.goods.material)
      ).toLowerCase().indexOf(term) >= 0);
    }
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-inbox"></i>No booking requests found.</div></td></tr>';
      return;
    }
    tbody.innerHTML = bookings.map(b => {
      const rate = bookingFreight(b);
      const pay = b.paymentStatus || 'PENDING';
      return '<tr>' +
        '<td><b>' + esc(b.ref) + '</b>' + (b.sample ? ' <span class="demo-tag">Sample</span>' : '') +
          '<br><small class="text-muted">' + (b.source ? esc(b.source) : 'Website') + '</small></td>' +
        '<td>' + esc(accountName(b)) + '<br><small class="text-muted">' + esc(b.customer && b.customer.mobile) + '</small></td>' +
        '<td>' + esc(b.pickup && b.pickup.city) + ' → ' + esc(b.delivery && b.delivery.city) +
          '<br><small class="text-muted">' + esc(b.vehicle && b.vehicle.type) + '</small></td>' +
        '<td>' + fmtDate(b.pickup && b.pickup.date) + '</td>' +
        '<td>' + (rate ? '<b>' + money(rate) + '</b>' : '<span class="text-muted">Not quoted</span>') +
          '<br><small class="' + (pay === 'PENDING' ? 'text-muted' : '') + '" style="color:' + (pay === 'FULLY PAID' ? 'var(--green)' : (pay === 'ADVANCE RECEIVED' ? '#1D5FD6' : 'var(--muted)')) + '">' + paymentLabel(pay) + '</small></td>' +
        '<td><span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-icon" data-action="view" data-ref="' + esc(b.ref) + '" title="View Booking"><i class="fa-solid fa-eye"></i></button>' +
          '<button class="btn-icon green" data-action="rate" data-ref="' + esc(b.ref) + '" title="' + (rate ? 'Revise Rate' : 'Send Rate') + '"><i class="fa-solid fa-indian-rupee-sign"></i></button>' +
          '<button class="btn-icon green" data-action="approve" data-ref="' + esc(b.ref) + '" title="Accept / Approve Request"><i class="fa-solid fa-check"></i></button>' +
          '<button class="btn-icon red" data-action="reject" data-ref="' + esc(b.ref) + '" title="Reject Request"><i class="fa-solid fa-xmark"></i></button>' +
          '<button class="btn-icon" data-action="assign" data-ref="' + esc(b.ref) + '" title="Assign Vehicle & Driver"><i class="fa-solid fa-truck-fast"></i></button>' +
          '<button class="btn-icon" data-action="status" data-ref="' + esc(b.ref) + '" title="Update Shipment Status"><i class="fa-solid fa-rotate"></i></button>' +
          '<button class="btn-icon" data-action="docs" data-ref="' + esc(b.ref) + '" title="Payment & E-way Bill"><i class="fa-solid fa-file-invoice"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function approveBooking(ref) {
    const admin = getAdminProfile();
    updateBooking(ref, b => {
      b.status = 'APPROVED';
      b.history.push({ status: 'APPROVED', at: nowISO(), note: 'Booking accepted / approved by ' + admin.name + ' (demo admin action)' });
    });
    toast('Booking ' + ref + ' accepted (demo).', 'success');
  }

  function rejectBooking(ref) {
    openModal('Reject Booking Request — ' + ref,
      '<div class="form-group"><label>Reason for rejection</label>' +
        '<textarea id="rejectReason" rows="3" placeholder="e.g. No vehicle available for this route/date"></textarea></div>' +
      '<p class="field-hint">The reason is saved in the booking history and shown to the customer in My Bookings.</p>',
      () => {
        const reason = ($('#rejectReason') && $('#rejectReason').value.trim()) || 'No reason provided';
        updateBooking(ref, b => {
          b.status = 'REJECTED';
          b.history.push({ status: 'REJECTED', at: nowISO(), note: 'Rejected by ' + getAdminProfile().name + ' — ' + reason + ' (demo admin action)' });
        });
        toast('Booking ' + ref + ' rejected (demo).', 'info');
      }, 'Reject Request');
  }

  function assignVehicle(ref) {
    const vehicles = getData(KEYS.vehicles, []);
    if (!vehicles.length) { toast('No vehicles in the demo fleet. Add a vehicle first.', 'error'); return; }
    const options = vehicles.map(v =>
      '<option value="' + esc(v.id) + '">' + esc(v.reg) + ' — ' + esc(v.type) + ' (' + esc(v.availability) + ')</option>'
    ).join('');
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    openModal('Assign Vehicle & Driver — ' + ref,
      '<div class="form-group"><label>Select Vehicle (demo fleet)</label><select id="assignVehicleSelect">' + options + '</select></div>' +
      '<div class="form-group" style="margin-top:14px;"><label>Note for the customer</label>' +
        '<textarea id="assignNote" rows="2" placeholder="e.g. Driver will call 1 hour before pickup"></textarea></div>' +
      '<p class="field-hint">Driver name & contact are copied from the fleet record. Vehicle type requested: <b>' +
        esc(b && b.vehicle ? b.vehicle.type : '—') + '</b>.</p>',
      () => {
        const sel = $('#assignVehicleSelect');
        const vehicle = vehicles.find(v => v.id === sel.value);
        if (!vehicle) { toast('Select a vehicle.', 'error'); return false; }
        const note = ($('#assignNote') && $('#assignNote').value.trim()) || '';
        updateBooking(ref, bk => {
          bk.vehicleReg = vehicle.reg;
          bk.driver = { name: vehicle.driver, contact: vehicle.contact };
          if (bk.status === 'PENDING COMPANY CONFIRMATION' || bk.status === 'APPROVED') bk.status = 'VEHICLE ASSIGNED';
          bk.history.push({
            status: 'VEHICLE ASSIGNED', at: nowISO(),
            note: 'Vehicle ' + vehicle.reg + ' & driver ' + vehicle.driver + ' assigned by ' + getAdminProfile().name +
                  (note ? ' — ' + note : '') + ' (demo admin action)'
          });
        });
        const all = getData(KEYS.vehicles, []);
        const vi = all.findIndex(v => v.id === vehicle.id);
        if (vi >= 0) { all[vi].assigned = ref; all[vi].availability = 'On Trip'; setData(KEYS.vehicles, all); renderVehiclesTable(); }
        toast('Vehicle & driver assigned to ' + ref + ' (demo).', 'success');
      }, 'Assign Vehicle');
  }

  function updateStatus(ref) {
    const options = STATUS_FLOW.map(s => '<option value="' + esc(s.key) + '">' + esc(s.label) + '</option>').join('') +
      '<option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option>';
    openModal('Update Shipment Status — ' + ref,
      '<div class="form-group"><label>New Status</label><select id="statusSelect">' + options + '</select></div>' +
      '<div class="form-group" style="margin-top:14px;"><label>Update note (optional)</label>' +
        '<textarea id="statusNote" rows="2" placeholder="e.g. Reached Nagpur check-post"></textarea></div>' +
      '<p class="field-hint">Demo action — in production only authorized staff can update shipment status and every change is logged.</p>',
      () => {
        const status = $('#statusSelect').value;
        const note = ($('#statusNote') && $('#statusNote').value.trim()) || '';
        updateBooking(ref, b => {
          b.status = status;
          b.history.push({ status: status, at: nowISO(), note: (note || 'Status updated via demo admin') + ' (demo admin action)' });
        });
        toast('Status updated for ' + ref + ' (demo).', 'success');
      }, 'Update Status');
  }

  function sendBookingRate(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const existing = b.freight || {};
    const today = new Date().toISOString().split('T')[0];
    openModal((existing.amount ? 'Revise Freight Rate — ' : 'Send Freight Rate — ') + ref,
      '<div class="form-grid-2">' +
        '<div class="form-group"><label>Freight Amount (₹) <em>*</em></label>' +
          '<input type="number" id="rateAmount" min="1" step="100" value="' + (existing.amount || '') + '" placeholder="e.g. 28500">' +
          '<small class="error-msg"></small></div>' +
        '<div class="form-group"><label>Rate Valid Till</label>' +
          '<input type="date" id="rateValid" min="' + today + '" value="' + (existing.validTill || '') + '"></div>' +
      '</div>' +
      '<div class="form-group" style="margin-top:14px;"><label>Note to customer</label>' +
        '<textarea id="rateNote" rows="2" placeholder="e.g. Toll & loading extra. Rate valid for 7 days.">' + esc(existing.note || '') + '</textarea></div>' +
      '<p class="field-hint">The rate appears in the customer\'s <b>My Bookings</b> history. It does not automatically confirm the booking — use Accept / Approve for that.</p>',
      () => {
        const amt = parseFloat($('#rateAmount').value);
        if (!amt || amt <= 0) {
          markInvalid($('#rateAmount'), 'Enter a valid freight amount.');
          return false;
        }
        const admin = getAdminProfile();
        updateBooking(ref, bk => {
          bk.freight = {
            amount: amt,
            note: ($('#rateNote').value || '').trim(),
            validTill: $('#rateValid').value || '',
            by: admin.name,
            at: nowISO()
          };
          bk.history.push({ status: bk.status, at: nowISO(), note: 'Freight rate ' + money(amt) + ' shared by ' + admin.name + ' (demo admin action)' });
        });
        toast('Rate ' + money(amt) + ' shared for ' + ref + ' (demo).', 'success');
      }, 'Send Rate');
  }

  function editBookingDocs(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const d = bookingDocs(b);
    const pay = b.paymentStatus || 'PENDING';
    const payOptions = PAYMENT_STATUSES.map(p => '<option value="' + p + '"' + (p === pay ? ' selected' : '') + '>' + paymentLabel(p) + '</option>').join('');
    openModal('Payment & E-way Bill — ' + ref,
      '<div class="form-grid-2">' +
        '<div class="form-group"><label>Payment Status</label><select id="docPayStatus">' + payOptions + '</select></div>' +
        '<div class="form-group"><label>E-way Bill Number</label><input type="text" id="docEwb" value="' + esc(d.ewb) + '" placeholder="e.g. 1234 5678 9012"></div>' +
        '<div class="form-group"><label>Invoice Number</label><input type="text" id="docInvoiceNo" value="' + esc(d.invoiceNo) + '" placeholder="Invoice / challan no."></div>' +
        '<div class="form-group"><label>Invoice Value (₹)</label><input type="number" id="docInvoiceValue" min="0" step="1" value="' + esc(d.invoiceValue) + '" placeholder="e.g. 185000"></div>' +
      '</div>' +
      '<div class="form-group" style="margin-top:14px;"><label>LR / Internal Remarks</label>' +
        '<textarea id="docRemarks" rows="2">' + esc(d.remarks) + '</textarea></div>' +
      '<p class="field-hint">These details print on the Lorry Receipt (LR) from the booking view. E-way bill rules must be verified with the customer.</p>',
      () => {
        updateBooking(ref, bk => {
          bk.paymentStatus = $('#docPayStatus').value;
          bk.docs = {
            ewb: $('#docEwb').value.trim(),
            invoiceNo: $('#docInvoiceNo').value.trim(),
            invoiceValue: $('#docInvoiceValue').value.trim(),
            remarks: $('#docRemarks').value.trim()
          };
          bk.history.push({
            status: bk.status, at: nowISO(),
            note: 'Payment & documents updated by ' + getAdminProfile().name + ' · ' + paymentLabel(bk.paymentStatus) + ' (demo admin action)'
          });
        });
        toast('Payment & documents saved for ' + ref + ' (demo).', 'success');
      }, 'Save Details');
  }

  function viewBooking(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const row = (k, v) => '<div class="summary-item"><small>' + k + '</small><b>' + (esc(v) || '—') + '</b></div>';
    const d = bookingDocs(b);
    const rate = bookingFreight(b);
    openModal('Booking Details — ' + ref,
      (b.sample ? '<span class="demo-tag">Sample data</span>' : '') +
      '<div class="inline-actions" style="justify-content:space-between;margin:12px 0 16px;">' +
        '<span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span>' +
        '<div class="inline-actions no-print">' +
          '<button class="btn btn-outline btn-xs" id="viewPrintBtn" type="button"><i class="fa-solid fa-print"></i> Booking</button>' +
          '<button class="btn btn-outline btn-xs" id="viewLRBtn" type="button"><i class="fa-solid fa-file-lines"></i> Lorry Receipt</button>' +
        '</div>' +
      '</div>' +
      '<div class="summary-grid">' +
        row('Customer', accountName(b) + (b.customer && b.customer.company ? ' (' + b.customer.company + ')' : '')) +
        row('Mobile', b.customer && b.customer.mobile) +
        row('Email', b.customer && b.customer.email) +
        row('GST', b.customer && b.customer.gst) +
        row('Pickup', [b.pickup.address, b.pickup.city].filter(Boolean).join(', ')) +
        row('Delivery', [b.delivery.address, b.delivery.city].filter(Boolean).join(', ')) +
        row('Consignee', b.delivery.consignee ? b.delivery.consignee + (b.delivery.consigneeMobile ? ' · ' + b.delivery.consigneeMobile : '') : '') +
        row('Pickup Date', fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + b.pickup.time : '')) +
        row('Vehicle', (b.vehicle.type || '') + (b.vehicle.capacity ? ' · ' + b.vehicle.capacity : '')) +
        row('Assigned Vehicle', b.vehicleReg) +
        row('Driver', b.driver && b.driver.name ? b.driver.name + ' · ' + b.driver.contact : '') +
        row('Material', b.goods.material) +
        row('Weight', b.goods.weight + ' T') +
        row('Packages', b.goods.packages) +
        row('Freight Rate', rate ? money(rate) + ' · valid till ' + (b.freight.validTill ? fmtDate(b.freight.validTill) : '—') : 'Not quoted yet') +
        row('Payment Status', paymentLabel(b.paymentStatus)) +
        row('E-way Bill', d.ewb) +
        row('Invoice', d.invoiceNo ? d.invoiceNo + (d.invoiceValue ? ' · ₹' + d.invoiceValue : '') : '') +
        row('Handling', b.goods.handling) +
        row('Source', b.source || 'Website') +
        row('Submitted', fmtDateTime(b.createdAt)) +
      '</div>' +
      (b.freight && b.freight.note ? '<p style="margin-top:14px;font-size:13px;color:#42597D;"><b>Rate note:</b> ' + esc(b.freight.note) + '</p>' : '') +
      '<h4 style="margin:18px 0 8px;font-size:16px;">Status History</h4>' +
      '<ul style="font-size:13.5px;">' + (b.history || []).map(h =>
        '<li style="padding:6px 0;border-bottom:1px solid #E3E8F0;"><b>' + fmtDateTime(h.at) + '</b> — ' + esc(h.status) +
        (h.note ? ' <span style="color:#71809A;">(' + esc(h.note) + ')</span>' : '') + '</li>'
      ).join('') + '</ul>',
      null, 'Close');
    const pb = $('#viewPrintBtn');
    if (pb) pb.addEventListener('click', () => printBooking(ref));
    const lb = $('#viewLRBtn');
    if (lb) lb.addEventListener('click', () => printLR(ref));
  }

  /* ---------- 18e. Quotation requests & admin rates ---------- */
  function updateQuote(ref, mutator) {
    const quotes = getData(KEYS.quotes, []);
    const i = quotes.findIndex(q => q.ref === ref);
    if (i < 0) { toast('Quotation request not found.', 'error'); return false; }
    mutator(quotes[i]);
    setData(KEYS.quotes, quotes);
    dispatchQuotesChanged();
    renderAdminStats();
    renderQuotesTable();
    renderAdminActivity();
    return true;
  }

  function renderQuotesTable() {
    const tbody = $('#quotesTableBody');
    if (!tbody) return;
    const filter = ($('#quoteFilter') && $('#quoteFilter').value) || 'ALL';
    let quotes = getData(KEYS.quotes, []).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (filter !== 'ALL') quotes = quotes.filter(q => (q.status || 'AWAITING QUOTATION') === filter);
    if (!quotes.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-file-invoice-dollar"></i>No quotation requests found.</div></td></tr>';
      return;
    }
    tbody.innerHTML = quotes.map(q => {
      const rate = q.rate && Number(q.rate.amount) > 0 ? q.rate : null;
      return '<tr>' +
        '<td><b>' + esc(q.ref) + '</b>' + (q.sample ? ' <span class="demo-tag">Sample</span>' : '') + '</td>' +
        '<td>' + esc(q.pickupCity) + ' → ' + esc(q.deliveryCity) +
          '<br><small class="text-muted">Pickup ' + fmtDate(q.date) + '</small></td>' +
        '<td>' + esc(q.material) + '<br><small class="text-muted">' + esc(q.weight) + ' T · ' + esc(q.truck) + '</small></td>' +
        '<td>' + esc(q.contact) + (q.email ? '<br><small class="text-muted">' + esc(q.email) + '</small>' : '') + '</td>' +
        '<td>' + (rate ? '<b>' + money(rate.amount) + '</b><br><small class="text-muted">valid till ' + (rate.validTill ? fmtDate(rate.validTill) : '—') + '</small>' : '<span class="text-muted">Needs rate</span>') + '</td>' +
        '<td><span class="pill ' + quotePill(q.status) + '">' + esc(q.status) + '</span>' +
          (q.convertedTo ? '<br><small class="text-muted">' + esc(q.convertedTo) + '</small>' : '') + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-icon green" data-qaction="rate" data-ref="' + esc(q.ref) + '" title="' + (rate ? 'Revise Rate' : 'Send Rate') + '"><i class="fa-solid fa-indian-rupee-sign"></i></button>' +
          '<button class="btn-icon" data-qaction="convert" data-ref="' + esc(q.ref) + '" title="Create Booking from Quote"><i class="fa-solid fa-truck-fast"></i></button>' +
          '<button class="btn-icon" data-qaction="view" data-ref="' + esc(q.ref) + '" title="View Quote"><i class="fa-solid fa-eye"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function sendQuoteRate(ref) {
    const q = getData(KEYS.quotes, []).find(x => x.ref === ref);
    if (!q) { toast('Quotation request not found.', 'error'); return; }
    const existing = q.rate || {};
    const today = new Date().toISOString().split('T')[0];
    openModal((existing.amount ? 'Revise Rate — ' : 'Send Rate — ') + ref,
      '<p style="font-size:13.5px;margin-bottom:16px;">Route: <b>' + esc(q.pickupCity) + ' → ' + esc(q.deliveryCity) +
        '</b> · ' + esc(q.truck) + ' · ' + esc(q.weight) + ' T · Pickup ' + fmtDate(q.date) + '</p>' +
      '<div class="form-grid-2">' +
        '<div class="form-group"><label>Freight Amount (₹) <em>*</em></label>' +
          '<input type="number" id="qRateAmount" min="1" step="100" value="' + (existing.amount || '') + '" placeholder="e.g. 46500">' +
          '<small class="error-msg"></small></div>' +
        '<div class="form-group"><label>Valid Till</label><input type="date" id="qRateValid" min="' + today + '" value="' + (existing.validTill || '') + '"></div>' +
      '</div>' +
      '<div class="form-group" style="margin-top:14px;"><label>Note to customer</label>' +
        '<textarea id="qRateNote" rows="2">' + esc(existing.note || '') + '</textarea></div>' +
      '<p class="field-hint">The customer sees this rate in <b>My Bookings → Quotation Requests</b>. It is an office rate, not an automated price.</p>',
      () => {
        const amt = parseFloat($('#qRateAmount').value);
        if (!amt || amt <= 0) {
          markInvalid($('#qRateAmount'), 'Enter a valid freight amount.');
          return false;
        }
        const admin = getAdminProfile();
        updateQuote(ref, quote => {
          quote.rate = {
            amount: amt,
            note: ($('#qRateNote').value || '').trim(),
            validTill: $('#qRateValid').value || '',
            by: admin.name,
            at: nowISO()
          };
          quote.status = 'RATE SENT';
        });
        toast('Rate ' + money(amt) + ' sent for ' + ref + ' (demo).', 'success');
      }, 'Send Rate');
  }

  function viewQuote(ref) {
    const q = getData(KEYS.quotes, []).find(x => x.ref === ref);
    if (!q) { toast('Quotation request not found.', 'error'); return; }
    const row = (k, v) => '<div class="summary-item"><small>' + k + '</small><b>' + (esc(v) || '—') + '</b></div>';
    openModal('Quotation ' + ref,
      '<p style="margin-bottom:14px;"><span class="pill ' + quotePill(q.status) + '">' + esc(q.status) + '</span>' + (q.sample ? ' <span class="demo-tag">Sample</span>' : '') + '</p>' +
      '<div class="summary-grid">' +
        row('Route', q.pickupCity + ' → ' + q.deliveryCity) +
        row('Truck', q.truck) +
        row('Material', q.material) +
        row('Weight', q.weight + ' T') +
        row('Pickup Date', fmtDate(q.date)) +
        row('Contact', q.contact) +
        row('Email', q.email) +
        row('Requested', fmtDateTime(q.createdAt)) +
        row('Customer Estimate', q.estimate ? money(q.estimate.low) + ' – ' + money(q.estimate.high) + ' (illustrative)' : '—') +
        row('Office Rate', q.rate ? money(q.rate.amount) + (q.rate.validTill ? ' · valid till ' + fmtDate(q.rate.validTill) : '') : 'Not sent yet') +
      '</div>' +
      (q.rate && q.rate.note ? '<p style="margin-top:14px;font-size:13px;color:#42597D;"><b>Note:</b> ' + esc(q.rate.note) + '</p>' : '') +
      (q.convertedTo ? '<p style="margin-top:14px;font-size:13px;"><b>Converted to booking:</b> ' + esc(q.convertedTo) + '</p>' : ''),
      null, 'Close');
  }

  function convertQuoteToBooking(ref) {
    const q = getData(KEYS.quotes, []).find(x => x.ref === ref);
    if (!q) { toast('Quotation request not found.', 'error'); return; }
    const form = $('#adminBookingForm');
    if (!form) return;
    showAdminTab('new');
    const set = (name, val) => { const el = form.querySelector('[name="' + name + '"]'); if (el) el.value = val == null ? '' : val; };
    set('nbName', '');
    set('nbCompany', '');
    set('nbMobile', q.contact || '');
    set('nbEmail', q.email || '');
    set('nbPickup', q.pickupCity || '');
    set('nbDrop', q.deliveryCity || '');
    set('nbDate', q.date || '');
    set('nbTruck', q.truck || '');
    set('nbWeight', q.weight || '');
    set('nbMaterial', q.material || '');
    set('nbFreight', q.rate && q.rate.amount ? q.rate.amount : '');
    set('nbQuoteRef', q.ref);
    set('nbNotes', 'Converted from quotation ' + q.ref);
    toast('Quotation details copied into the booking form. Add the customer name and save.', 'info');
    $('#adminBookingForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 18f. Rate card editor ---------- */
  function renderRateCardAdmin() {
    const rates = getRates();
    if ($('#rateDocFee')) $('#rateDocFee').value = rates.docFee;
    if ($('#rateGst')) $('#rateGst').value = rates.gstPct;
    if ($('#rateDetention')) $('#rateDetention').value = rates.detentionPerDay;
    const tbody = $('#rateTableBody');
    if (!tbody) return;
    tbody.innerHTML = rates.trucks.map(t =>
      '<tr data-rate-row data-type="' + esc(t.type) + '">' +
        '<td><b>' + esc(t.type) + '</b><br><small class="text-muted">' + esc(t.capacity) + '</small></td>' +
        '<td><input type="number" min="0" step="100" data-rate-base value="' + t.base + '" aria-label="Base fare for ' + esc(t.type) + '"></td>' +
        '<td><input type="number" min="0" step="1" data-rate-perkm value="' + t.perKm + '" aria-label="Per km rate for ' + esc(t.type) + '"></td>' +
        '<td><input type="number" min="0" step="100" data-rate-loading value="' + t.loading + '" aria-label="Loading charge for ' + esc(t.type) + '"></td>' +
        '<td><small class="text-muted">' + esc(t.note) + '</small></td>' +
      '</tr>'
    ).join('');
    const upd = $('#rateUpdated');
    if (upd) upd.textContent = rates.updatedAt ? 'Last updated ' + fmtDateTime(rates.updatedAt) : 'Using default demo rates (not yet edited)';
  }

  /* ---------- 18g. Demo tools ---------- */
  function exportBookingsCSV() {
    const bookings = getData(KEYS.bookings, []);
    if (!bookings.length) { toast('There are no bookings to export.', 'error'); return; }
    const rows = [['Reference', 'Source', 'Customer', 'Mobile', 'Email', 'Pickup City', 'Delivery City', 'Pickup Date', 'Truck Type', 'Weight (T)', 'Freight (INR)', 'Payment', 'Status', 'Created']];
    bookings.forEach(b => {
      rows.push([
        b.ref, b.source || 'Website', accountName(b), b.customer && b.customer.mobile, b.customer && b.customer.email,
        b.pickup && b.pickup.city, b.delivery && b.delivery.city, b.pickup && b.pickup.date,
        b.vehicle && b.vehicle.type, b.goods && b.goods.weight,
        bookingFreight(b) || '', paymentLabel(b.paymentStatus), b.status, b.createdAt
      ]);
    });
    const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    try {
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rptc-bookings-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      toast('Bookings exported as CSV (demo data).', 'success');
    } catch (err) {
      toast('CSV export is not supported in this browser.', 'error');
    }
  }

  function resetDemoData() {
    openModal('Reset Demo Data',
      '<p>This removes all bookings, quotation requests, vehicles, customer accounts, messages, rate-card changes, admin profile and password changes stored <b>in this browser</b>, then reloads the labelled sample data.</p>' +
      '<p class="field-hint">Your admin session stays active. This does not affect any real server data (there is none in this demo).</p>',
      () => {
        [KEYS.bookings, KEYS.quotes, KEYS.vehicles, KEYS.users, KEYS.messages, KEYS.rates, KEYS.adminProfile, KEYS.adminCreds].forEach(k => localStorage.removeItem(k));
        seedDemoData();
        renderAdminProfile();
        renderAdminStats();
        renderBookingsTable();
        renderQuotesTable();
        renderRateCardAdmin();
        renderVehiclesTable();
        renderAdminActivity();
        showAdminTab('overview');
        toast('Demo data reset to fresh sample records.', 'success');
      }, 'Reset Data');
  }

  /* ---------- 19. Fleet (vehicle) management ---------- */
  function renderVehiclesTable() {
    const tbody = $('#vehiclesTableBody');
    if (!tbody) return;
    const vehicles = getData(KEYS.vehicles, []);
    if (!vehicles.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-truck"></i>No vehicles added yet.</div></td></tr>';
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

  function editVehicle(id) {
    const v = getData(KEYS.vehicles, []).find(x => x.id === id);
    if (!v) return;
    const form = $('#vehicleForm');
    if (!form) return;
    setf(form, 'vId', v.id);
    setf(form, 'vReg', v.reg);
    setf(form, 'vType', v.type);
    setf(form, 'vCapacity', v.capacity);
    setf(form, 'vDriver', v.driver);
    setf(form, 'vContact', v.contact);
    setf(form, 'vAvailability', v.availability);
    setf(form, 'vLocation', v.location);
    setf(form, 'vAssigned', v.assigned);
    $('#vehicleFormTitle').textContent = 'Edit Vehicle — ' + v.reg;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteVehicle(id) {
    const v = getData(KEYS.vehicles, []).find(x => x.id === id);
    openModal('Remove Vehicle',
      '<p>Remove vehicle <b>' + esc(v ? v.reg : id) + '</b> from the demo fleet? This action is stored only in this browser.</p>',
      () => {
        const vehicles = getData(KEYS.vehicles, []).filter(x => x.id !== id);
        setData(KEYS.vehicles, vehicles);
        renderVehiclesTable();
        toast('Vehicle removed (demo).', 'info');
      }, 'Remove');
  }

  /* ---------- 20. Print booking details (standalone print window) ---------- */
  function printBooking(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const row = (k, v) => '<tr><th style="text-align:left;padding:7px 10px;width:38%;background:#F4F6F8;">' + k + '</th><td style="padding:7px 10px;">' + (esc(v) || '—') + '</td></tr>';
    const rate = bookingFreight(b);
    const d = bookingDocs(b);
    const w = window.open('', '_blank');
    if (!w) { toast('Please allow pop-ups to print the booking.', 'error'); return; }
    w.document.write(
      '<html><head><title>' + esc(b.ref) + ' — RP TRANSPORT COMPANY</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#111;padding:34px;max-width:760px;margin:auto;}' +
      'h1{color:#B30000;margin:0 0 4px;font-size:26px;}h2{background:#0A2342;color:#fff;padding:14px 18px;font-size:18px;margin:0 0 18px;}' +
      'table{width:100%;border-collapse:collapse;margin-top:14px;}td,th{border:1px solid #bbb;}' +
      '.note{margin-top:22px;padding:12px;background:#FFF4DC;border:1px dashed #E4C36A;font-size:13px;}' +
      '.pill{display:inline-block;padding:4px 12px;background:#F4F6F8;border-radius:20px;font-size:12px;font-weight:bold;}</style></head><body>' +
      '<h2>RP TRANSPORT COMPANY (RPTC) — WE DELIVER SAFE.</h2>' +
      '<h1>Booking Request: ' + esc(b.ref) + '</h1>' +
      '<span class="pill">' + esc(b.status) + '</span>' +
      '<table>' +
        row('Customer', accountName(b) + (b.customer.company ? ' (' + b.customer.company + ')' : '')) +
        row('Mobile', b.customer.mobile) + row('Email', b.customer.email) + row('GST', b.customer.gst) +
        row('Pickup', [b.pickup.address, b.pickup.city, b.pickup.state, b.pickup.pin].filter(Boolean).join(', ')) +
        row('Delivery', [b.delivery.address, b.delivery.city, b.delivery.state, b.delivery.pin].filter(Boolean).join(', ')) +
        row('Pickup Date', fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + b.pickup.time : '')) +
        row('Vehicle', b.vehicle.type + (b.vehicle.capacity ? ' · ' + b.vehicle.capacity : '')) +
        row('Assigned Vehicle', b.vehicleReg) +
        row('Driver', b.driver && b.driver.name ? b.driver.name + ' · ' + b.driver.contact : '') +
        row('Goods', b.goods.material + ' · ' + b.goods.weight + ' T · ' + (b.goods.packages || '—') + ' packages') +
        row('Handling', b.goods.handling) +
        row('Freight Rate', rate ? money(rate) + (b.freight.validTill ? ' (valid till ' + fmtDate(b.freight.validTill) + ')' : '') : 'To be advised by RPTC') +
        row('Payment Preference', b.payment.freight + ' · Advance: ' + b.payment.advance) +
        row('Payment Status', paymentLabel(b.paymentStatus)) +
        row('E-way Bill', d.ewb) +
        row('Invoice', d.invoiceNo ? d.invoiceNo + (d.invoiceValue ? ' · ₹' + d.invoiceValue : '') : '') +
        row('Submitted', fmtDateTime(b.createdAt)) +
      '</table>' +
      '<div class="note"><b>Note:</b> This is a booking REQUEST summary generated by the RPTC frontend demonstration. ' +
      'It is not a confirmed truck booking until approved by RP TRANSPORT COMPANY. ' +
      'Contact: ' + COMPANY.phone1 + ' / ' + COMPANY.phone2 + ' · ' + COMPANY.email + '</div>' +
      '</body></html>'
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 450);
  }

  /* ---------- 21. Print Lorry Receipt / consignment note (demo) ---------- */
  function printLR(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const d = bookingDocs(b);
    const rate = bookingFreight(b);
    const lrNo = 'LR-' + String(b.ref || ref).replace(/^RPTC-/, '');
    const safe = (v) => esc(v == null || v === '' ? '—' : v);
    const line = (label, value) => '<tr><th>' + label + '</th><td>' + value + '</td></tr>';
    const w = window.open('', '_blank');
    if (!w) { toast('Please allow pop-ups to print the lorry receipt.', 'error'); return; }
    w.document.write(
      '<html><head><title>' + safe(lrNo) + ' — RP TRANSPORT COMPANY</title><style>' +
      '*{box-sizing:border-box;}body{font-family:Arial,sans-serif;color:#111;margin:0;padding:28px;}' +
      '.sheet{max-width:800px;margin:auto;border:2px solid #0A2342;padding:22px 24px;}' +
      '.lr-head{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #B30000;padding-bottom:14px;}' +
      '.lr-head h1{margin:0;font-size:24px;color:#B30000;letter-spacing:.5px;}' +
      '.lr-head p{margin:3px 0;font-size:11.5px;color:#333;}' +
      '.lr-no{text-align:right;white-space:nowrap;}' +
      '.lr-no span{display:block;font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase;}' +
      '.lr-no b{display:block;font-size:17px;color:#0A2342;}' +
      '.demo{margin:12px 0;padding:7px 10px;border:1px dashed #B30000;color:#B30000;font-size:10.5px;font-weight:bold;text-align:center;letter-spacing:1px;}' +
      'table{width:100%;border-collapse:collapse;}th,td{border:1px solid #999;padding:7px 9px;font-size:11.5px;vertical-align:top;}' +
      'th{background:#EEF2F7;text-align:left;width:24%;color:#0A2342;}' +
      '.cols{display:flex;gap:14px;}.cols>div{flex:1;}' +
      'h3{margin:16px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#0A2342;}' +
      '.decl{font-size:10.5px;color:#333;line-height:1.55;margin-top:12px;border-top:1px solid #ccc;padding-top:10px;}' +
      '.signs{display:flex;justify-content:space-between;gap:20px;margin-top:38px;font-size:10.5px;text-align:center;}' +
      '.signs div{flex:1;border-top:1px solid #333;padding-top:6px;}' +
      '.foot{margin-top:16px;text-align:center;font-size:9.5px;color:#777;}' +
      '@media print{body{padding:0;}.sheet{border:1px solid #333;}}' +
      '</style></head><body><div class="sheet">' +
      '<div class="lr-head"><div>' +
        '<h1>RP TRANSPORT COMPANY (RPTC)</h1>' +
        '<p>Fleet Owner &amp; Transport Contractor · WE DELIVER SAFE.</p>' +
        '<p>' + esc(COMPANY.address) + '</p>' +
        '<p>' + esc(COMPANY.phone1) + ' / ' + esc(COMPANY.phone2) + ' · ' + esc(COMPANY.email) + '</p>' +
      '</div><div class="lr-no"><span>Consignment Note</span><b>' + safe(lrNo) + '</b><span style="margin-top:6px;">Date</span><b style="font-size:12px;">' +
        fmtDate(b.createdAt) + '</b><span style="margin-top:6px;">Booking Ref</span><b style="font-size:12px;">' + safe(b.ref) + '</b></div></div>' +
      '<div class="demo">DEMO DOCUMENT — NOT A VALID TRANSPORT DOCUMENT / E-WAY BILL</div>' +
      '<div class="cols"><div><h3>Consignor (Customer)</h3><table>' +
        line('Name', safe(accountName(b)) + (b.customer.company ? ' · ' + safe(b.customer.company) : '')) +
        line('Mobile', safe(b.customer.mobile)) +
        line('GSTIN', safe(b.customer.gst)) +
        line('Pickup', safe([b.pickup.address, b.pickup.city, b.pickup.state, b.pickup.pin].filter(Boolean).join(', '))) +
        line('Pickup Date', fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + safe(b.pickup.time) : '')) +
      '</table></div><div><h3>Consignee (Receiver)</h3><table>' +
        line('Name', safe(b.delivery.consignee)) +
        line('Mobile', safe(b.delivery.consigneeMobile)) +
        line('Delivery', safe([b.delivery.address, b.delivery.city, b.delivery.state, b.delivery.pin].filter(Boolean).join(', '))) +
        line('Invoice', d.invoiceNo ? safe(d.invoiceNo) + (d.invoiceValue ? ' · ₹' + safe(d.invoiceValue) : '') : '—') +
        line('E-way Bill', safe(d.ewb)) +
      '</table></div></div>' +
      '<h3>Consignment & Vehicle Details</h3><table>' +
        line('Material', safe(b.goods.material) + (b.goods.category ? ' · ' + safe(b.goods.category) : '')) +
        line('Weight / Packages', safe(b.goods.weight) + ' T · ' + safe(b.goods.packages) + ' packages') +
        line('Vehicle Type', safe(b.vehicle.type) + (b.vehicle.capacity ? ' · ' + safe(b.vehicle.capacity) : '')) +
        line('Vehicle Number', safe(b.vehicleReg)) +
        line('Driver', b.driver && b.driver.name ? safe(b.driver.name) + ' · ' + safe(b.driver.contact) : '—') +
        line('Freight', rate ? money(rate) + ' (rate shared by RPTC)' : 'To be advised by RPTC') +
        line('Payment Status', paymentLabel(b.paymentStatus)) +
        line('Special Instructions', safe(b.goods.handling || (b.payment && b.payment.instructions))) +
        line('LR Remarks', safe(d.remarks)) +
      '</table>' +
      '<div class="decl"><b>Declaration (demo):</b> This lorry receipt is generated by the RPTC front-end demonstration for illustration only. ' +
      'It does not transfer title, is not an e-way bill, is not a tax invoice and is not valid for statutory or insurance purposes. ' +
      'Goods are carried at owner\'s risk unless transit insurance is separately arranged. E-way bill requirements must be verified with the customer and the RPTC office.</div>' +
      '<div class="signs"><div>Consignor / Customer</div><div>Driver / Transporter</div><div>Consignee / Receiver</div></div>' +
      '<div class="foot">' + esc(COMPANY.name) + ' · ' + esc(COMPANY.tagline) + ' · Generated ' + fmtDateTime(nowISO()) + '</div>' +
      '</div></body></html>'
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 450);
  }

  /* ==========================================================================
     22. MY BOOKINGS / BOOKING HISTORY (my-bookings.html)
     Shows bookings & quotation requests stored in this browser; when a
     customer is logged in the list is scoped to their account (email/mobile)
     with a switch to view every record saved in this browser.
     ========================================================================== */
  function bookingPrefillURL(b) {
    const params = new URLSearchParams({
      pickup: (b.pickup && b.pickup.city) || '',
      delivery: (b.delivery && b.delivery.city) || '',
      truck: (b.vehicle && b.vehicle.type) || '',
      weight: (b.goods && b.goods.weight) || '',
      material: (b.goods && b.goods.material) || '',
      name: accountName(b),
      mobile: (b.customer && b.customer.mobile) || ''
    });
    return 'booking.html?' + params.toString();
  }
  function quotePrefillURL(q) {
    const params = new URLSearchParams({
      pickup: q.pickupCity || '', delivery: q.deliveryCity || '', truck: q.truck || '',
      weight: q.weight || '', material: q.material || '', mobile: q.contact || '',
      date: q.date || ''
    });
    return 'booking.html?' + params.toString();
  }

  function initMyBookingsPage() {
    const page = $('#myBookingsPage');
    if (!page) return;
    const session = getData(KEYS.session, null);
    const state = { tab: 'bookings', q: '', status: 'ALL', sort: 'new', all: !session };
    const listEl = $('#historyList');
    const quoteEl = $('#quoteList');

    /* ---- account strip ---- */
    if (session) {
      if ($('#accountName')) $('#accountName').textContent = session.name || 'Customer';
      if ($('#accountSub')) {
        $('#accountSub').textContent = 'Showing bookings linked to ' + (session.email || '') +
          (session.mobile ? ' / ' + session.mobile : '') + '. Use the switch to see every record saved in this browser.';
      }
      if ($('#accountSwitchWrap')) $('#accountSwitchWrap').hidden = false;
      if ($('#accountGuestCta')) $('#accountGuestCta').hidden = true;
    } else {
      if ($('#accountName')) $('#accountName').textContent = 'Guest (this browser)';
      if ($('#accountSub')) {
        $('#accountSub').textContent = 'Showing every booking saved in this browser. Log in to link bookings to your account.';
      }
      if ($('#accountSwitchWrap')) $('#accountSwitchWrap').hidden = true;
      if ($('#accountGuestCta')) $('#accountGuestCta').hidden = false;
    }
    const showAll = $('#showAllBookings');
    if (showAll) {
      showAll.checked = state.all;
      showAll.addEventListener('change', () => { state.all = showAll.checked; renderAll(); });
    }

    /* ---- helpers ---- */
    function scopeBookings() {
      let list = getData(KEYS.bookings, []).slice();
      if (session && !state.all) {
        const email = (session.email || '').toLowerCase();
        const mobile = session.mobile || '';
        list = list.filter(b => {
          const c = b.customer || {};
          if (b.accountEmail && email && String(b.accountEmail).toLowerCase() === email) return true;
          if (email && String(c.email || '').toLowerCase() === email) return true;
          if (mobile && String(c.mobile || '') === mobile) return true;
          return false;
        });
      }
      return list;
    }
    function scopeQuotes() {
      let list = getData(KEYS.quotes, []).slice();
      if (session && !state.all) {
        const email = (session.email || '').toLowerCase();
        const mobile = session.mobile || '';
        list = list.filter(q =>
          (email && String(q.email || '').toLowerCase() === email) ||
          (mobile && String(q.contact || '') === mobile)
        );
      }
      return list;
    }
    function matchesTerm(b, term) {
      const hay = [
        b.ref, accountName(b), b.customer && b.customer.mobile,
        b.pickup && b.pickup.city, b.delivery && b.delivery.city,
        b.goods && b.goods.material, b.vehicle && b.vehicle.type, b.status
      ].join(' ').toLowerCase();
      return hay.indexOf(term) >= 0;
    }
    function sortList(list) {
      return list.sort((a, b) => {
        if (state.sort === 'old') return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
        if (state.sort === 'pickup') return String((a.pickup && a.pickup.date) || a.date || '').localeCompare(String((b.pickup && b.pickup.date) || b.date || ''));
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
    }
    function filterBookings(scope) {
      let list = scope.slice();
      if (state.status !== 'ALL') list = list.filter(b => b.status === state.status);
      if (state.q) list = list.filter(b => matchesTerm(b, state.q));
      return sortList(list);
    }
    function renderStats(scope) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('hbTotal', scope.length);
      set('hbPending', scope.filter(b => b.status === 'PENDING COMPANY CONFIRMATION').length);
      set('hbActive', scope.filter(b => ['APPROVED', 'VEHICLE ASSIGNED', 'PICKED UP', 'IN TRANSIT'].indexOf(b.status) >= 0).length);
      set('hbDelivered', scope.filter(b => b.status === 'DELIVERED').length);
      set('hbFreight', money(scope.reduce((sum, b) => sum + (bookingFreight(b) || 0), 0)));
    }

    function metaItem(label, value) {
      return '<div><small>' + label + '</small><b>' + (esc(value) || '—') + '</b></div>';
    }
    function bookingCard(b) {
      const rate = bookingFreight(b);
      const pay = b.paymentStatus || 'PENDING';
      const last = (b.history || []).slice(-1)[0] || {};
      const stopped = b.status === 'REJECTED' || b.status === 'CANCELLED';
      let noteHTML = '';
      if (stopped) {
        noteHTML = '<div class="hc-note amber"><i class="fa-solid fa-circle-info"></i><div><b>' +
          (b.status === 'CANCELLED' ? 'Booking cancelled' : 'Request not approved') + '</b><span>' +
          esc(last.note || 'Please contact the RPTC office for details.') + '</span></div></div>';
      } else if (rate) {
        noteHTML = '<div class="hc-note"><i class="fa-solid fa-indian-rupee-sign"></i><div><b>Rate shared by RPTC: ' + money(rate) + '</b><span>' +
          esc(b.freight.note || 'Freight rate confirmed by the RPTC office.') +
          (b.freight.validTill ? ' · valid till ' + fmtDate(b.freight.validTill) : '') +
          ' · ' + paymentLabel(pay) + '</span></div></div>';
      } else {
        noteHTML = '<div class="hc-note amber"><i class="fa-solid fa-hourglass-half"></i><div><b>Freight rate awaited</b><span>The RPTC office will share the freight rate here after checking your route and vehicle availability.</span></div></div>';
      }
      const cancelBtn = canCustomerCancel(b)
        ? '<button type="button" class="link-action" data-haction="cancel" data-ref="' + esc(b.ref) + '"><i class="fa-solid fa-ban"></i> Cancel request</button>'
        : '';
      return '<article class="history-card">' +
        '<div class="hc-head">' +
          '<div><span class="hc-ref">' + esc(b.ref) + '</span>' + (b.sample ? '<span class="demo-tag">Sample</span>' : '') +
            '<span class="hc-date">Booked ' + fmtDateTime(b.createdAt) + (b.source ? ' · ' + esc(b.source) : '') + '</span></div>' +
          '<span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span>' +
        '</div>' +
        '<div class="hc-body">' +
          '<div class="hc-route">' +
            '<div class="hc-city"><small><i class="fa-solid fa-location-dot"></i> Pickup</small><b>' + esc(b.pickup && b.pickup.city) + '</b><span>' + fmtDate(b.pickup && b.pickup.date) + (b.pickup && b.pickup.time ? ' · ' + esc(b.pickup.time) : '') + '</span></div>' +
            '<div class="hc-arrow"><i class="fa-solid fa-truck-fast"></i></div>' +
            '<div class="hc-city"><small><i class="fa-solid fa-flag-checkered"></i> Delivery</small><b>' + esc(b.delivery && b.delivery.city) + '</b><span>' + esc(b.delivery && b.delivery.state) + '</span></div>' +
          '</div>' +
          '<div class="hc-meta">' +
            metaItem('Goods', b.goods && b.goods.material) +
            metaItem('Weight', (b.goods && b.goods.weight ? b.goods.weight + ' T' : '')) +
            metaItem('Truck', b.vehicle && b.vehicle.type) +
            metaItem('Freight', rate ? money(rate) : 'Awaiting rate') +
            metaItem('Payment', paymentLabel(pay)) +
            metaItem('Assign vehicle', b.vehicleReg || 'Not assigned') +
            metaItem('Driver', b.driver && b.driver.name ? b.driver.name + (b.driver.contact ? ' · ' + b.driver.contact : '') : 'Not assigned') +
            metaItem('Packages', b.goods && b.goods.packages) +
          '</div>' +
          noteHTML +
          '<div class="hc-actions no-print">' +
            '<button type="button" class="btn btn-outline btn-sm" data-haction="timeline" data-ref="' + esc(b.ref) + '"><i class="fa-solid fa-clock-rotate-left"></i> View History</button>' +
            '<a href="tracking.html?ref=' + encodeURIComponent(b.ref) + '" class="btn btn-navy btn-sm"><i class="fa-solid fa-magnifying-glass-location"></i> Track</a>' +
            '<button type="button" class="btn btn-outline btn-sm" data-haction="lr" data-ref="' + esc(b.ref) + '"><i class="fa-solid fa-file-lines"></i> Lorry Receipt</button>' +
            '<a href="' + bookingPrefillURL(b) + '" class="btn btn-outline btn-sm"><i class="fa-solid fa-rotate-right"></i> Re-book</a>' +
            cancelBtn +
          '</div>' +
        '</div>' +
      '</article>';
    }

    function quoteCard(q) {
      const rate = q.rate && Number(q.rate.amount) > 0 ? q.rate : null;
      return '<article class="history-card">' +
        '<div class="hc-head">' +
          '<div><span class="hc-ref">' + esc(q.ref) + '</span>' + (q.sample ? '<span class="demo-tag">Sample</span>' : '') +
            '<span class="hc-date">Requested ' + fmtDateTime(q.createdAt) + '</span></div>' +
          '<span class="pill ' + quotePill(q.status) + '">' + esc(q.status) + '</span>' +
        '</div>' +
        '<div class="hc-body">' +
          '<div class="hc-route">' +
            '<div class="hc-city"><small><i class="fa-solid fa-location-dot"></i> Pickup</small><b>' + esc(q.pickupCity) + '</b><span>' + fmtDate(q.date) + '</span></div>' +
            '<div class="hc-arrow"><i class="fa-solid fa-truck-fast"></i></div>' +
            '<div class="hc-city"><small><i class="fa-solid fa-flag-checkered"></i> Delivery</small><b>' + esc(q.deliveryCity) + '</b><span>' + esc(q.truck) + '</span></div>' +
          '</div>' +
          '<div class="hc-meta">' +
            metaItem('Material', q.material) +
            metaItem('Weight', (q.weight ? q.weight + ' T' : '')) +
            metaItem('Truck type', q.truck) +
            metaItem('Contact', q.contact) +
          '</div>' +
          (rate
            ? '<div class="hc-note"><i class="fa-solid fa-indian-rupee-sign"></i><div><b>Rate from RPTC: ' + money(rate.amount) + '</b><span>' +
                esc(rate.note || 'Rate shared by the RPTC office.') +
                (rate.validTill ? ' · valid till ' + fmtDate(rate.validTill) : '') + '</span></div></div>'
            : '<div class="hc-note amber"><i class="fa-solid fa-hourglass-half"></i><div><b>Rate request under review</b><span>The RPTC office will send a freight rate here. You can also call or WhatsApp the transport team.</span></div></div>') +
          '<div class="hc-actions no-print">' +
            '<a href="' + quotePrefillURL(q) + '" class="btn btn-red btn-sm"><i class="fa-solid fa-truck-fast"></i> Book this truck</a>' +
            '<a href="' + waLink('Hello RP TRANSPORT COMPANY, I have a query about quotation ' + q.ref + ' (' + q.pickupCity + ' to ' + q.deliveryCity + ').') + '" target="_blank" rel="noopener" class="btn btn-wa btn-sm"><i class="fa-brands fa-whatsapp"></i> Enquire</a>' +
            '<a href="tel:' + COMPANY.phone1Raw + '" class="btn btn-outline btn-sm"><i class="fa-solid fa-phone"></i> Call Office</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }

    function renderAll() {
      const scope = scopeBookings();
      renderStats(scope);
      const bookings = filterBookings(scope);
      listEl.innerHTML = bookings.length
        ? bookings.map(bookingCard).join('')
        : '<div class="empty-panel"><i class="fa-solid fa-truck-fast"></i><h3>No bookings yet</h3><p>Your truck booking history will appear here as soon as you submit a booking request.</p><a href="booking.html" class="btn btn-red"><i class="fa-solid fa-truck-fast"></i> Book a Truck</a></div>';

      const quotes = sortList(scopeQuotes().filter(q => !state.q || [
        q.ref, q.pickupCity, q.deliveryCity, q.material, q.truck, q.contact
      ].join(' ').toLowerCase().indexOf(state.q) >= 0));
      quoteEl.innerHTML = quotes.length
        ? quotes.map(quoteCard).join('')
        : '<div class="empty-panel"><i class="fa-solid fa-file-invoice-dollar"></i><h3>No quotation requests</h3><p>Request a freight quote and any rate shared by the RPTC office will appear here.</p><a href="booking.html#freight-quote" class="btn btn-navy"><i class="fa-solid fa-calculator"></i> Request a Quote</a></div>';
      const count = $('#quoteCount');
      if (count) count.textContent = quotes.length;
    }

    /* ---- toolbar & tabs ---- */
    $('#historySearch') && $('#historySearch').addEventListener('input', e => {
      state.q = (e.target.value || '').trim().toLowerCase();
      renderAll();
    });
    $('#historyStatus') && $('#historyStatus').addEventListener('change', e => {
      state.status = e.target.value;
      renderAll();
    });
    $('#historySort') && $('#historySort').addEventListener('change', e => {
      state.sort = e.target.value;
      renderAll();
    });
    $$('.seg-tab', page).forEach(btn => btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab || 'bookings';
      $$('.seg-tab', page).forEach(b => b.classList.toggle('active', b === btn));
      if ($('#bookingsPanel')) $('#bookingsPanel').hidden = state.tab !== 'bookings';
      if ($('#quotesPanel')) $('#quotesPanel').hidden = state.tab !== 'quotes';
      if ($('#statusFilterWrap')) $('#statusFilterWrap').hidden = state.tab !== 'bookings';
      renderAll();
    }));

    /* ---- actions ---- */
    listEl && listEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-haction]');
      if (!btn) return;
      const ref = btn.dataset.ref;
      if (btn.dataset.haction === 'timeline') showBookingTimeline(ref);
      if (btn.dataset.haction === 'lr') printLR(ref);
      if (btn.dataset.haction === 'cancel') cancelCustomerBooking(ref);
    });
    document.addEventListener('rptc:bookings-changed', () => renderAll());

    // Deep links: my-bookings.html#quotes opens the quotation tab
    if ((location.hash || '') === '#quotes') {
      const qTab = $('.seg-tab[data-tab="quotes"]');
      if (qTab) qTab.click();
    }
    renderAll();
  }

  function showBookingTimeline(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const rate = bookingFreight(b);
    const hist = b.history || [];
    const items = hist.map((h, i) => {
      const current = i === hist.length - 1;
      return '<div class="vt-item done' + (current ? ' current' : '') + '">' +
        '<span class="vt-dot"></span>' +
        '<b>' + esc(h.status) + '</b>' +
        '<small>' + fmtDateTime(h.at) + '</small>' +
        (h.note ? '<p>' + esc(h.note) + '</p>' : '') +
      '</div>';
    }).join('');
    const row = (k, v) => '<div class="summary-item"><small>' + k + '</small><b>' + (esc(v) || '—') + '</b></div>';
    openModal('Booking History — ' + b.ref,
      '<div class="inline-actions" style="justify-content:space-between;margin-bottom:14px;">' +
        '<span class="pill ' + pillClass(b.status) + '">' + esc(b.status) + '</span>' +
        '<button type="button" class="btn btn-outline btn-xs no-print" id="timelineLR"><i class="fa-solid fa-file-lines"></i> Lorry Receipt</button>' +
      '</div>' +
      '<div class="summary-grid" style="margin-bottom:18px;">' +
        row('Route', (b.pickup && b.pickup.city) + ' → ' + (b.delivery && b.delivery.city)) +
        row('Pickup Date', fmtDate(b.pickup && b.pickup.date)) +
        row('Truck', b.vehicle && b.vehicle.type) +
        row('Freight', rate ? money(rate) : 'Awaiting rate') +
        row('Payment', paymentLabel(b.paymentStatus)) +
        row('Driver', b.driver && b.driver.name ? b.driver.name + ' · ' + b.driver.contact : 'Not assigned') +
      '</div>' +
      '<h4 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Status Timeline</h4>' +
      '<div class="vt">' + (items || '<p class="field-hint">No timeline entries recorded.</p>') + '</div>' +
      '<p class="field-hint" style="margin-top:14px;">Every status change is logged with a timestamp. Shipments are never marked picked up, in transit or delivered automatically.</p>',
      null, 'Close');
    const lrBtn = $('#timelineLR');
    if (lrBtn) lrBtn.addEventListener('click', () => printLR(ref));
  }

  function cancelCustomerBooking(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    openModal('Cancel Booking Request — ' + ref,
      '<p>Apply to cancel booking <b>' + esc(ref) + '</b>? The status changes to <b>Cancelled</b> and is recorded in the booking history.</p>' +
      '<div class="form-group" style="margin-top:12px;"><label>Reason (optional)</label>' +
      '<textarea id="cancelReason" rows="2" placeholder="e.g. Pickup date changed"></textarea></div>' +
      '<p class="field-hint">Demo action — please also inform the RPTC office by phone or WhatsApp so the vehicle is released.</p>',
      () => {
        const reason = ($('#cancelReason') && $('#cancelReason').value.trim()) || '';
        const ok = mutateBookingRecord(ref, bk => {
          bk.status = 'CANCELLED';
          bk.history.push({ status: 'CANCELLED', at: nowISO(), note: 'Cancelled by customer' + (reason ? ' — ' + reason : '') });
        });
        if (ok) {
          toast('Booking ' + ref + ' cancelled (demo). Please also inform the RPTC office on ' + COMPANY.phone1 + '.', 'info');
        }
      }, 'Cancel Booking');
  }

  /* ---------- 22b. Rate card & freight calculator (rate-card.html) ---------- */
  function initRateCardPage() {
    const page = $('#rateCardPage');
    if (!page) return;
    const rates = getRates();

    $$('[data-rate-updated]').forEach(el => {
      el.textContent = rates.updatedAt
        ? 'Rate card last updated by admin on ' + fmtDateTime(rates.updatedAt)
        : 'Using default demo rate card — not yet edited by the admin.';
    });

    const tbody = $('#rateCardBody');
    if (tbody) {
      tbody.innerHTML = rates.trucks.map(t =>
        '<tr>' +
          '<td><b>' + esc(t.type) + '</b><small>' + esc(t.note) + '</small></td>' +
          '<td>' + esc(t.capacity) + '</td>' +
          '<td><b>' + money(t.base) + '</b></td>' +
          '<td><b>' + money(t.perKm) + '</b> / km</td>' +
          '<td>' + money(t.loading) + '</td>' +
          '<td><a href="booking.html?truck=' + encodeURIComponent(t.type) + '" class="btn btn-outline btn-xs">Book</a></td>' +
        '</tr>'
      ).join('');
    }

    const select = $('#calcTruck');
    if (!select) return;
    select.innerHTML = rates.trucks.map(t =>
      '<option value="' + esc(t.type) + '">' + esc(t.type) + ' — ' + esc(t.capacity) + '</option>'
    ).join('');

    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const num = (id) => Math.max(0, parseFloat(val(id)) || 0);
    const checked = (id) => { const el = document.getElementById(id); return !!(el && el.checked); };

    function recalc() {
      const truck = rates.trucks.find(t => t.type === select.value) || rates.trucks[0];
      const distance = num('calcDistance');
      const roundTrip = val('calcTrip') === 'round';
      const km = distance * (roundTrip ? 2 : 1);
      const distanceCost = Math.round(truck.perKm * km);
      const loading = checked('calcLoading') ? truck.loading : 0;
      const doc = checked('calcDoc') ? rates.docFee : 0;
      const detentionDays = num('calcDetention');
      const detention = Math.round(detentionDays * rates.detentionPerDay);
      const subtotal = truck.base + distanceCost + loading + doc + detention;
      const gst = Math.round(subtotal * rates.gstPct / 100);
      const total = subtotal + gst;

      const breakdown = $('#calcBreakdown');
      if (breakdown) {
        breakdown.innerHTML =
          '<div class="calc-row"><span>Base fare — ' + esc(truck.type) + '</span><b>' + money(truck.base) + '</b></div>' +
          '<div class="calc-row"><span>Distance ' + (km ? km + ' km × ' + money(truck.perKm) : '(enter distance)') + '</span><b>' + money(distanceCost) + '</b></div>' +
          (loading ? '<div class="calc-row"><span>Loading / unloading</span><b>' + money(loading) + '</b></div>' : '') +
          (doc ? '<div class="calc-row"><span>Documentation fee</span><b>' + money(doc) + '</b></div>' : '') +
          (detention ? '<div class="calc-row"><span>Detention / standby (' + detentionDays + ' day' + (detentionDays === 1 ? '' : 's') + ')</span><b>' + money(detention) + '</b></div>' : '') +
          '<div class="calc-row"><span>Subtotal</span><b>' + money(subtotal) + '</b></div>' +
          '<div class="calc-row"><span>GST @ ' + rates.gstPct + '%</span><b>' + money(gst) + '</b></div>';
      }
      const totalEl = $('#calcTotal');
      if (totalEl) totalEl.innerHTML = '<span>Indicative total</span><span>' + money(total) + '</span>';

      const note = $('#calcNote');
      if (note) {
        note.textContent = distance
          ? 'Estimate only. Toll, parking, extra halting, insurance and any route-specific charges are extra and confirmed by the RPTC office.'
          : 'Enter the approximate route distance (km) to see an indicative freight estimate.';
      }

      const book = $('#calcBook');
      if (book) book.href = 'booking.html?truck=' + encodeURIComponent(truck.type);
      const quoteLink = $('#calcQuote');
      if (quoteLink) quoteLink.href = 'booking.html#freight-quote';
      const wa = $('#calcWhatsapp');
      if (wa) {
        wa.href = waLink('Hello RP TRANSPORT COMPANY, I used the freight calculator on your website. Truck: ' + truck.type +
          ', distance: ' + (km || '—') + ' km' + (roundTrip ? ' (round trip)' : '') + ', indicative total: ' + money(total) +
          '. Please share the final freight rate.');
      }
    }

    ['calcTruck', 'calcDistance', 'calcTrip', 'calcDetention'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', recalc); el.addEventListener('change', recalc); }
    });
    ['calcLoading', 'calcDoc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', recalc);
    });
    recalc();
  }

  /* ---------- 24. Initialisation ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    seedDemoData();     // load clearly-labelled sample data on first visit
    initNav();          // sticky navbar + mobile hamburger menu
    initReveal();       // scroll reveal animations
    initMisc();         // dates, back-to-top, WhatsApp links, year
    initHomePage();     // quick booking (index.html)
    initBookingPage();  // full booking form (booking.html)
    initQuotation();    // freight quotation (booking.html)
    initTrackingPage(); // shipment tracking (tracking.html)
    initContactPage();  // contact form (contact.html)
    initAuthPage();     // login / registration (login.html)
    initAdminPage();    // demo admin dashboard + fleet (admin.html)
    initAdminLoginPage(); // separate admin login (admin-login.html)
    initMyBookingsPage(); // booking history + quotation requests (my-bookings.html)
    initRateCardPage();   // rate card + freight calculator (rate-card.html)
  });
})();
