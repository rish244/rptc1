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

  /* ---------- 2. LocalStorage helpers ---------- */
  const KEYS = {
    bookings: 'rptc_bookings',
    quotes:   'rptc_quotes',
    vehicles: 'rptc_vehicles',
    users:    'rptc_users',
    messages: 'rptc_messages',
    session:  'rptc_session'
  };
  const getData = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  };
  const setData = (key, value) => localStorage.setItem(key, JSON.stringify(value));

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
          truck: 'Open Body Truck', date: '2026-12-20', contact: '9820000009',
          status: 'AWAITING QUOTATION',
          estimate: { low: 16500, high: 22500, illustrative: true }
        }
      ]);
    }
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
      const booking = {
        ref: genBookingRef(),
        sample: false,
        createdAt: nowISO(),
        customer: { name: v('cName'), company: v('cCompany'), mobile: v('cMobile'), email: v('cEmail'), gst: v('cGst') },
        pickup:   { address: v('pAddress'), city: v('pCity'), state: v('pState'), pin: v('pPin'), date: v('pDate'), time: v('pTime') },
        delivery: { address: v('dAddress'), city: v('dCity'), state: v('dState'), pin: v('dPin') },
        goods:    { material: v('gMaterial'), category: v('gCategory'), weight: v('gWeight'), packages: v('gPackages'), dimensions: v('gDimensions'), handling: v('gHandling') },
        vehicle:  { type: v('vType'), capacity: v('vCapacity') },
        payment:  { freight: v('payFreight'), advance: v('payAdvance'), instructions: v('payInstructions') },
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
      const quote = {
        ref: genQuoteRef(),
        sample: false,
        createdAt: nowISO(),
        pickupCity: v('qPickup'), deliveryCity: v('qDelivery'), material: v('qMaterial'),
        weight: v('qWeight'), truck: v('qTruck'), date: v('qDate'), contact: v('qContact'),
        status: 'AWAITING QUOTATION',
        estimate: estimate
      };
      const quotes = getData(KEYS.quotes, []);
      quotes.push(quote);
      setData(KEYS.quotes, quotes);
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
      $('#tDate').textContent = fmtDate(booking.pickup.date);
      const last = (booking.history || []).slice(-1)[0];
      $('#tUpdated').textContent = last ? fmtDateTime(last.at) : fmtDateTime(booking.createdAt);
      // Estimated delivery is shown ONLY when available from authorized data
      $('#tEta').textContent = booking.eta ? fmtDate(booking.eta) : 'Will be shared after company confirmation';
      renderTimeline(booking.status);
      wrap.hidden = false;
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderTimeline(status) {
    const rejected = status === 'REJECTED';
    const idx = STATUS_FLOW.findIndex(s => s.key === status);
    const icons = ['fa-clipboard-list', 'fa-circle-check', 'fa-truck', 'fa-box-open', 'fa-route', 'fa-flag-checkered'];
    const wrap = $('#timeline');
    wrap.innerHTML = STATUS_FLOW.map((s, i) => {
      let cls = 'tl-step';
      if (rejected) cls += '';
      else if (i < idx) cls += ' done';
      else if (i === idx) cls += ' active';
      const lastHist = !rejected && i <= idx;
      return '<div class="' + cls + '">' +
        '<div class="tl-dot"><i class="fa-solid ' + (i < idx ? 'fa-check' : icons[i]) + '"></i></div>' +
        '<h4>' + s.label + '</h4>' +
        '<p>' + (rejected ? '—' : (lastHist ? 'Reached' : 'Pending')) + '</p>' +
      '</div>';
    }).join('');
    $('#timelineRejected').hidden = !rejected;
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
      const name = form.rName.value.trim(), email = form.rEmail.value.trim().toLowerCase();
      const mobile = form.rMobile.value.trim(), pass = form.rPass.value;
      const confirm = form.rPass2.value;
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
      const email = form.lEmail.value.trim().toLowerCase();
      const pass = form.lPass.value;
      const user = getData(KEYS.users, []).find(u => u.email === email && u.password === pass);
      if (!user) {
        markInvalid(form.lPass, 'Invalid email or password (demo).');
        toast('Invalid credentials. Please register first (demo).', 'error');
        return;
      }
      setData(KEYS.session, { name: user.name, email: user.email, at: nowISO() });
      toast('Welcome back, ' + user.name + '!', 'success');
      showSession(user);
    });
  }

  /* ---------- 18. ADMIN DASHBOARD (demonstration only) ---------- */
  function initAdminPage() {
    if (!$('#adminDashboard')) return;
    renderAdminStats();
    renderBookingsTable();
    renderVehiclesTable();

    $('#bookingFilter') && $('#bookingFilter').addEventListener('change', renderBookingsTable);

    // Booking action buttons (event delegation)
    $('#bookingsTableBody') && $('#bookingsTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const ref = btn.dataset.ref, action = btn.dataset.action;
      if (action === 'view') viewBooking(ref);
      if (action === 'approve') approveBooking(ref);
      if (action === 'reject') rejectBooking(ref);
      if (action === 'assign') assignVehicle(ref);
      if (action === 'status') updateStatus(ref);
      if (action === 'print') printBooking(ref);
    });

    // Fleet form (add / update)
    const vForm = $('#vehicleForm');
    vForm && vForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(vForm)) return;
      const v = (n) => { const el = vForm.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      const vehicles = getData(KEYS.vehicles, []);
      const id = vForm.vId.value;
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
      vForm.vId.value = '';
      $('#vehicleFormTitle').textContent = 'Add Vehicle (Demo)';
      toast(id ? 'Vehicle updated (demo).' : 'Vehicle added (demo).', 'success');
    });
    $('#vehicleReset') && $('#vehicleReset').addEventListener('click', () => {
      vForm.reset();
      vForm.vId.value = '';
      $('#vehicleFormTitle').textContent = 'Add Vehicle (Demo)';
    });

    // Fleet table actions (edit / delete)
    $('#vehiclesTableBody') && $('#vehiclesTableBody').addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') editVehicle(id);
      if (btn.dataset.action === 'delete') deleteVehicle(id);
    });
  }

  function renderAdminStats() {
    const bookings = getData(KEYS.bookings, []);
    const quotes = getData(KEYS.quotes, []);
    const count = (fn) => bookings.filter(fn).length;
    $('#stTotal').textContent = bookings.length;
    $('#stPending').textContent = count(b => b.status === 'PENDING COMPANY CONFIRMATION');
    $('#stApproved').textContent = count(b => b.status === 'APPROVED' || b.status === 'VEHICLE ASSIGNED');
    $('#stCompleted').textContent = count(b => b.status === 'DELIVERED');
    $('#stQuotes').textContent = quotes.length;
  }

  function renderBookingsTable() {
    const tbody = $('#bookingsTableBody');
    if (!tbody) return;
    const filter = ($('#bookingFilter') && $('#bookingFilter').value) || 'ALL';
    let bookings = getData(KEYS.bookings, []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (filter !== 'ALL') bookings = bookings.filter(b => b.status === filter);
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-inbox"></i>No booking requests found.</div></td></tr>';
      return;
    }
    tbody.innerHTML = bookings.map(b =>
      '<tr>' +
        '<td><b>' + b.ref + '</b>' + (b.sample ? ' <span class="demo-tag">Sample</span>' : '') + '</td>' +
        '<td>' + (b.customer.name || '—') + '</td>' +
        '<td>' + (b.pickup.city || '—') + ' → ' + (b.delivery.city || '—') + '</td>' +
        '<td>' + (b.vehicle.type || '—') + '</td>' +
        '<td>' + fmtDate(b.pickup.date) + '</td>' +
        '<td><span class="pill ' + pillClass(b.status) + '">' + b.status + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-icon" data-action="view" data-ref="' + b.ref + '" title="View Booking"><i class="fa-solid fa-eye"></i></button>' +
          '<button class="btn-icon green" data-action="approve" data-ref="' + b.ref + '" title="Approve Request"><i class="fa-solid fa-check"></i></button>' +
          '<button class="btn-icon red" data-action="reject" data-ref="' + b.ref + '" title="Reject Request"><i class="fa-solid fa-xmark"></i></button>' +
          '<button class="btn-icon" data-action="assign" data-ref="' + b.ref + '" title="Assign Vehicle"><i class="fa-solid fa-truck-fast"></i></button>' +
          '<button class="btn-icon" data-action="status" data-ref="' + b.ref + '" title="Update Shipment Status"><i class="fa-solid fa-rotate"></i></button>' +
          '<button class="btn-icon" data-action="print" data-ref="' + b.ref + '" title="Print Booking Details"><i class="fa-solid fa-print"></i></button>' +
        '</div></td>' +
      '</tr>'
    ).join('');
  }

  function updateBooking(ref, mutator) {
    const bookings = getData(KEYS.bookings, []);
    const i = bookings.findIndex(b => b.ref === ref);
    if (i < 0) { toast('Booking not found.', 'error'); return; }
    mutator(bookings[i]);
    setData(KEYS.bookings, bookings);
    renderAdminStats();
    renderBookingsTable();
  }

  function approveBooking(ref) {
    updateBooking(ref, b => {
      b.status = 'APPROVED';
      b.history.push({ status: 'APPROVED', at: nowISO(), note: 'Approved by RPTC team (demo admin action)' });
    });
    toast('Booking ' + ref + ' approved (demo).', 'success');
  }

  function rejectBooking(ref) {
    openModal('Reject Booking Request', '<p>Reject booking request <b>' + ref + '</b>? This is a demonstration action stored only in this browser.</p>', () => {
      updateBooking(ref, b => {
        b.status = 'REJECTED';
        b.history.push({ status: 'REJECTED', at: nowISO(), note: 'Rejected by RPTC team (demo admin action)' });
      });
      toast('Booking ' + ref + ' rejected (demo).', 'info');
    }, 'Reject');
  }

  function assignVehicle(ref) {
    const vehicles = getData(KEYS.vehicles, []);
    if (!vehicles.length) { toast('No vehicles in the demo fleet. Add a vehicle first.', 'error'); return; }
    const options = vehicles.map(v =>
      '<option value="' + v.id + '">' + v.reg + ' — ' + v.type + ' (' + v.availability + ')</option>'
    ).join('');
    openModal('Assign Vehicle to ' + ref,
      '<div class="form-group"><label>Select Vehicle (demo fleet)</label><select id="assignVehicleSelect">' + options + '</select></div>',
      () => {
        const sel = $('#assignVehicleSelect');
        const vehicle = vehicles.find(v => v.id === sel.value);
        updateBooking(ref, b => {
          b.vehicleReg = vehicle.reg;
          if (b.status === 'PENDING COMPANY CONFIRMATION' || b.status === 'APPROVED') b.status = 'VEHICLE ASSIGNED';
          b.history.push({ status: 'VEHICLE ASSIGNED', at: nowISO(), note: 'Vehicle ' + vehicle.reg + ' assigned (demo admin action)' });
        });
        // Reflect assignment on the vehicle record too
        const all = getData(KEYS.vehicles, []);
        const vi = all.findIndex(v => v.id === vehicle.id);
        if (vi >= 0) { all[vi].assigned = ref; all[vi].availability = 'On Trip'; setData(KEYS.vehicles, all); renderVehiclesTable(); }
        toast('Vehicle assigned to ' + ref + ' (demo).', 'success');
      }, 'Assign Vehicle');
  }

  function updateStatus(ref) {
    const options = STATUS_FLOW.map(s => '<option value="' + s.key + '">' + s.label + '</option>').join('') +
      '<option value="REJECTED">Rejected</option>';
    openModal('Update Shipment Status — ' + ref,
      '<div class="form-group"><label>New Status</label><select id="statusSelect">' + options + '</select></div>' +
      '<p style="font-size:13px;color:#71809A;margin-top:10px;">Demo action — in production, only authorized staff can update shipment status and every change is logged.</p>',
      () => {
        const status = $('#statusSelect').value;
        updateBooking(ref, b => {
          b.status = status;
          b.history.push({ status: status, at: nowISO(), note: 'Status updated via demo admin' });
        });
        toast('Status updated for ' + ref + ' (demo).', 'success');
      }, 'Update Status');
  }

  function viewBooking(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const row = (k, v) => '<div class="summary-item"><small>' + k + '</small><b>' + (v || '—') + '</b></div>';
    openModal('Booking Details — ' + ref,
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
        row('Material', b.goods.material) +
        row('Weight', b.goods.weight + ' T') +
        row('Packages', b.goods.packages) +
        row('Handling', b.goods.handling) +
        row('Payment Preference', b.payment.freight + ' · Advance: ' + b.payment.advance) +
        row('Submitted', fmtDateTime(b.createdAt)) +
      '</div>' +
      '<p style="margin-top:16px;"><span class="pill ' + pillClass(b.status) + '">' + b.status + '</span></p>' +
      '<h4 style="margin:18px 0 8px;font-size:16px;">Status History</h4>' +
      '<ul style="font-size:13.5px;">' + (b.history || []).map(h =>
        '<li style="padding:6px 0;border-bottom:1px solid #E3E8F0;"><b>' + fmtDateTime(h.at) + '</b> — ' + h.status + (h.note ? ' <span style="color:#71809A;">(' + h.note + ')</span>' : '') + '</li>'
      ).join('') + '</ul>'
    );
  }

  /* ---------- 19. Fleet (vehicle) management ---------- */
  function renderVehiclesTable() {
    const tbody = $('#vehiclesTableBody');
    if (!tbody) return;
    const vehicles = getData(KEYS.vehicles, []);
    if (!vehicles.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-truck"></i>No vehicles added yet.</div></td></tr>';
      return;
    }
    tbody.innerHTML = vehicles.map(v =>
      '<tr>' +
        '<td><b>' + v.reg + '</b></td>' +
        '<td>' + v.type + '</td>' +
        '<td>' + v.capacity + '</td>' +
        '<td>' + v.driver + '</td>' +
        '<td>' + v.contact + '</td>' +
        '<td><span class="pill ' + (v.availability === 'Available' ? 'pill-delivered' : (v.availability === 'On Trip' ? 'pill-progress' : 'pill-pending')) + '">' + v.availability + '</span></td>' +
        '<td>' + (v.location || '—') + '</td>' +
        '<td>' + (v.assigned || '—') + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-icon" data-action="edit" data-id="' + v.id + '" title="Edit Vehicle"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="btn-icon red" data-action="delete" data-id="' + v.id + '" title="Remove Vehicle"><i class="fa-solid fa-trash"></i></button>' +
        '</div></td>' +
      '</tr>'
    ).join('');
  }

  function editVehicle(id) {
    const v = getData(KEYS.vehicles, []).find(x => x.id === id);
    if (!v) return;
    const form = $('#vehicleForm');
    form.vId.value = v.id;
    form.vReg.value = v.reg;
    form.vType.value = v.type;
    form.vCapacity.value = v.capacity;
    form.vDriver.value = v.driver;
    form.vContact.value = v.contact;
    form.vAvailability.value = v.availability;
    form.vLocation.value = v.location;
    form.vAssigned.value = v.assigned;
    $('#vehicleFormTitle').textContent = 'Edit Vehicle — ' + v.reg;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteVehicle(id) {
    openModal('Remove Vehicle', '<p>Remove this demo vehicle record? This action is stored only in this browser.</p>', () => {
      const vehicles = getData(KEYS.vehicles, []).filter(v => v.id !== id);
      setData(KEYS.vehicles, vehicles);
      renderVehiclesTable();
      toast('Vehicle removed (demo).', 'info');
    }, 'Remove');
  }

  /* ---------- 20. Print booking details (standalone print window) ---------- */
  function printBooking(ref) {
    const b = getData(KEYS.bookings, []).find(x => x.ref === ref);
    if (!b) { toast('Booking not found.', 'error'); return; }
    const row = (k, v) => '<tr><th style="text-align:left;padding:7px 10px;width:38%;background:#F4F6F8;">' + k + '</th><td style="padding:7px 10px;">' + (v || '—') + '</td></tr>';
    const w = window.open('', '_blank');
    w.document.write(
      '<html><head><title>' + b.ref + ' — RP TRANSPORT COMPANY</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#111;padding:34px;max-width:760px;margin:auto;}' +
      'h1{color:#B30000;margin:0 0 4px;font-size:26px;}h2{background:#0A2342;color:#fff;padding:14px 18px;font-size:18px;margin:0 0 18px;}' +
      'table{width:100%;border-collapse:collapse;margin-top:14px;}td,th{border:1px solid #bbb;}' +
      '.note{margin-top:22px;padding:12px;background:#FFF4DC;border:1px dashed #E4C36A;font-size:13px;}' +
      '.pill{display:inline-block;padding:4px 12px;background:#F4F6F8;border-radius:20px;font-size:12px;font-weight:bold;}</style></head><body>' +
      '<h2>RP TRANSPORT COMPANY (RPTC) — WE DELIVER SAFE.</h2>' +
      '<h1>Booking Request: ' + b.ref + '</h1>' +
      '<span class="pill">' + b.status + '</span>' +
      '<table>' +
        row('Customer', b.customer.name + (b.customer.company ? ' (' + b.customer.company + ')' : '')) +
        row('Mobile', b.customer.mobile) + row('Email', b.customer.email) + row('GST', b.customer.gst) +
        row('Pickup', b.pickup.address + ', ' + b.pickup.city + ', ' + b.pickup.state + ' – ' + b.pickup.pin) +
        row('Delivery', b.delivery.address + ', ' + b.delivery.city + ', ' + b.delivery.state + ' – ' + b.delivery.pin) +
        row('Pickup Date', fmtDate(b.pickup.date) + (b.pickup.time ? ' · ' + b.pickup.time : '')) +
        row('Vehicle', b.vehicle.type + (b.vehicle.capacity ? ' · ' + b.vehicle.capacity : '')) +
        row('Assigned Vehicle', b.vehicleReg) +
        row('Goods', b.goods.material + ' · ' + b.goods.weight + ' T · ' + (b.goods.packages || '—') + ' packages') +
        row('Handling', b.goods.handling) +
        row('Payment', b.payment.freight + ' · Advance: ' + b.payment.advance) +
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

  /* ---------- 21. Initialisation ---------- */
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
  });
})();
