require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createDatabase } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'rptc_transport_jwt_secret_2026';
const TOKEN_COOKIE = 'rptc_token';

const VALID_STATUSES = [
  'PENDING COMPANY CONFIRMATION',
  'APPROVED',
  'VEHICLE ASSIGNED',
  'PICKED UP',
  'IN TRANSIT',
  'DELIVERED',
  'REJECTED'
];

const FALLBACK_FLEET_SPECS = {
  'Open Body Truck': [
    { name: 'Open Body Truck — 9 T', cap: 'Up to 9 tons · open body', icon: 'fa-truck' },
    { name: 'Open Body Truck — 16 T (Multi-axle)', cap: 'Up to 16 tons · heavy open body', icon: 'fa-truck-moving' },
    { name: 'Open Body Truck — 7.5 T', cap: 'Up to 7.5 tons · city-friendly', icon: 'fa-truck-fast' }
  ],
  'Container Truck': [
    { name: 'Container Truck — 20 ft (7.5 T)', cap: 'Sealed 20 ft container', icon: 'fa-box-open' },
    { name: 'Container Truck — 24 ft (9 T)', cap: 'Sealed 24 ft container', icon: 'fa-box' },
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

function cleanStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isValidMobile(val) {
  return /^[6-9]\d{9}$/.test(cleanStr(val).replace(/[\s-]/g, ''));
}

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanStr(val));
}

function isValidPin(val) {
  return /^\d{6}$/.test(cleanStr(val));
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function extractUser(req, db) {
  let token = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.cookies && req.cookies[TOKEN_COOKIE]) {
    token = req.cookies[TOKEN_COOKIE];
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.get('SELECT id, name, email, mobile, role, created_at FROM users WHERE id = ?', [decoded.id]);
    return user || null;
  } catch (err) {
    return null;
  }
}

async function createApp(customDbPath) {
  const db = await createDatabase(customDbPath);
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Attach authenticated user if present
  app.use((req, _res, next) => {
    req.user = extractUser(req, db);
    next();
  });

  function requireAuth(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Admin login required.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    next();
  }

  function setAuthCookie(res, token) {
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  /* ================= 1. HEALTH CHECK ================= */
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, database: 'connected', timestamp: new Date().toISOString() });
  });

  /* ================= 2. AUTHENTICATION ================= */
  app.post('/api/auth/register', (req, res) => {
    const name = cleanStr(req.body.name);
    const email = cleanStr(req.body.email).toLowerCase();
    const mobile = cleanStr(req.body.mobile).replace(/[\s-]/g, '');
    const password = String(req.body.password || '');

    if (!name) return res.status(400).json({ error: 'Full name is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!isValidMobile(mobile)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const { lastInsertRowid } = db.run(
      'INSERT INTO users (name, email, mobile, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, mobile, passwordHash, 'customer', now]
    );

    const user = { id: lastInsertRowid, name, email, mobile, role: 'customer' };
    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ message: 'Account created successfully.', token, user });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = cleanStr(req.body.email).toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const row = db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = { id: row.id, name: row.name, email: row.email, mobile: row.mobile, role: row.role };
    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ message: 'Logged in successfully.', token, user });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(TOKEN_COOKIE);
    res.json({ message: 'Logged out successfully.' });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) {
      return res.json({ user: null });
    }
    res.json({ user: req.user });
  });

  /* ================= 3. LIVE FLEET AVAILABILITY CHECK ================= */
  app.post('/api/availability', (req, res) => {
    const truckType = cleanStr(req.body.truck) || 'Open Body Truck';
    const availableFleet = db.all(
      "SELECT id, reg, type, capacity, location, availability FROM vehicles WHERE type = ? AND availability = 'Available'",
      [truckType]
    );
    const otherAvailable = db.all(
      "SELECT id, reg, type, capacity, location, availability FROM vehicles WHERE availability = 'Available' LIMIT 3"
    );

    const items = [];
    for (const v of availableFleet) {
      items.push({
        name: `${v.type} — ${v.capacity} (${v.reg})`,
        cap: `Currently at ${v.location || 'Kalamboli Hub'} · Verified RPTC Fleet`,
        icon: 'fa-truck-fast',
        badge: 'Available in Fleet',
        badgeClass: 'pill-delivered'
      });
    }

    if (items.length === 0) {
      for (const v of otherAvailable) {
        items.push({
          name: `${v.type} — ${v.capacity} (${v.reg})`,
          cap: `Alternate available fleet at ${v.location || 'Kalamboli Hub'}`,
          icon: 'fa-truck',
          badge: 'Alternate Available',
          badgeClass: 'pill-approved'
        });
      }
      const specs = FALLBACK_FLEET_SPECS[truckType] || FALLBACK_FLEET_SPECS['Open Body Truck'];
      for (const s of specs.slice(0, 2)) {
        items.push({
          name: s.name,
          cap: `${s.cap} · Partner arrangement within 24 hours`,
          icon: s.icon,
          badge: 'On Request',
          badgeClass: 'pill-pending'
        });
      }
    }

    res.json({
      availableCount: availableFleet.length,
      items
    });
  });

  /* ================= 4. BOOKINGS & SHIPMENT TRACKING ================= */
  app.post('/api/bookings', (req, res) => {
    const b = req.body || {};
    const customer = {
      name: cleanStr(b.customer && b.customer.name),
      company: cleanStr(b.customer && b.customer.company),
      mobile: cleanStr(b.customer && b.customer.mobile).replace(/[\s-]/g, ''),
      email: cleanStr(b.customer && b.customer.email).toLowerCase(),
      gst: cleanStr(b.customer && b.customer.gst)
    };
    const pickup = {
      address: cleanStr(b.pickup && b.pickup.address),
      city: cleanStr(b.pickup && b.pickup.city),
      state: cleanStr(b.pickup && b.pickup.state),
      pin: cleanStr(b.pickup && b.pickup.pin),
      date: cleanStr(b.pickup && b.pickup.date),
      time: cleanStr(b.pickup && b.pickup.time)
    };
    const delivery = {
      address: cleanStr(b.delivery && b.delivery.address),
      city: cleanStr(b.delivery && b.delivery.city),
      state: cleanStr(b.delivery && b.delivery.state),
      pin: cleanStr(b.delivery && b.delivery.pin)
    };
    const goods = {
      material: cleanStr(b.goods && b.goods.material),
      category: cleanStr(b.goods && b.goods.category),
      weight: cleanStr(String((b.goods && b.goods.weight) || '')),
      packages: cleanStr(String((b.goods && b.goods.packages) || '')),
      dimensions: cleanStr(b.goods && b.goods.dimensions),
      handling: cleanStr(b.goods && b.goods.handling)
    };
    const vehicle = {
      type: cleanStr(b.vehicle && b.vehicle.type),
      capacity: cleanStr(b.vehicle && b.vehicle.capacity)
    };
    const payment = {
      freight: cleanStr(b.payment && b.payment.freight) || 'Sender Pays',
      advance: cleanStr(b.payment && b.payment.advance) || 'No',
      instructions: cleanStr(b.payment && b.payment.instructions)
    };

    if (!customer.name) return res.status(400).json({ error: 'Customer full name is required.' });
    if (!isValidMobile(customer.mobile)) return res.status(400).json({ error: 'Valid 10-digit customer mobile number is required.' });
    if (customer.email && !isValidEmail(customer.email)) return res.status(400).json({ error: 'Customer email address is invalid.' });
    if (!pickup.address || !pickup.city || !pickup.state || !isValidPin(pickup.pin) || !pickup.date) {
      return res.status(400).json({ error: 'Complete pickup address, city, state, 6-digit PIN and pickup date are required.' });
    }
    if (!delivery.address || !delivery.city || !delivery.state || !isValidPin(delivery.pin)) {
      return res.status(400).json({ error: 'Complete delivery address, city, state and 6-digit PIN are required.' });
    }
    if (!goods.material || !(parseFloat(goods.weight) > 0)) {
      return res.status(400).json({ error: 'Goods material type and valid weight (in tons) are required.' });
    }
    if (!vehicle.type) {
      return res.status(400).json({ error: 'Vehicle / truck type is required.' });
    }

    const ref = db.nextBookingRef();
    const now = new Date().toISOString();
    const status = 'PENDING COMPANY CONFIRMATION';
    const history = [{ status, at: now, note: 'Booking request received via online portal' }];
    const userId = req.user ? req.user.id : null;

    db.run(
      `INSERT INTO bookings (
        ref, user_id, sample, customer_json, pickup_json, delivery_json,
        goods_json, vehicle_json, payment_json, status, vehicle_reg, eta, history_json, created_at
      ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        ref,
        userId,
        JSON.stringify(customer),
        JSON.stringify(pickup),
        JSON.stringify(delivery),
        JSON.stringify(goods),
        JSON.stringify(vehicle),
        JSON.stringify(payment),
        status,
        JSON.stringify(history),
        now
      ]
    );

    const saved = db.formatBookingRow(db.get('SELECT * FROM bookings WHERE ref = ?', [ref]));
    res.status(201).json({ message: 'Booking submitted successfully.', booking: saved });
  });

  app.get('/api/bookings/track/:ref', (req, res) => {
    const ref = cleanStr(req.params.ref).toUpperCase();
    const row = db.get('SELECT * FROM bookings WHERE UPPER(ref) = ?', [ref]);
    if (!row) {
      return res.status(404).json({ error: 'No booking record found for reference ' + ref });
    }
    res.json({ booking: db.formatBookingRow(row) });
  });

  app.get('/api/bookings/my', requireAuth, (req, res) => {
    const rows = db.all('SELECT * FROM bookings ORDER BY created_at DESC');
    const allBookings = rows.map(db.formatBookingRow);
    const userEmail = (req.user.email || '').toLowerCase();
    const userMobile = req.user.mobile || '';
    const mine = allBookings.filter(b =>
      b.userId === req.user.id ||
      (userEmail && (b.customer.email || '').toLowerCase() === userEmail) ||
      (userMobile && b.customer.mobile === userMobile)
    );
    res.json({ bookings: mine });
  });

  /* ================= 5. FREIGHT QUOTATIONS ================= */
  app.post('/api/quotes', (req, res) => {
    const pickupCity = cleanStr(req.body.pickupCity);
    const deliveryCity = cleanStr(req.body.deliveryCity);
    const material = cleanStr(req.body.material);
    const weight = parseFloat(req.body.weight);
    const truck = cleanStr(req.body.truck);
    const date = cleanStr(req.body.date);
    const contact = cleanStr(req.body.contact).replace(/[\s-]/g, '');

    if (!pickupCity || !deliveryCity || !material || !truck || !date) {
      return res.status(400).json({ error: 'All route, material, truck and date fields are required.' });
    }
    if (!(weight > 0)) {
      return res.status(400).json({ error: 'Enter a valid goods weight greater than zero.' });
    }
    if (!isValidMobile(contact)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    }

    const baseRates = {
      'Light Commercial Vehicle': 6000,
      'Open Body Truck': 12000,
      'Medium Commercial Vehicle': 15000,
      'Container Truck': 18000,
      'Heavy Commercial Vehicle': 25000
    };
    const base = baseRates[truck] || 12000;
    const total = base + weight * 900;
    const estimate = {
      low: Math.round((total * 0.9) / 500) * 500,
      high: Math.round((total * 1.25) / 500) * 500,
      illustrative: true
    };

    const ref = db.nextQuoteRef();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO quotes (
        ref, sample, pickup_city, delivery_city, material, weight, truck, pickup_date, contact, status, estimate_json, admin_note, created_at
      ) VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, 'AWAITING QUOTATION', ?, '', ?)`,
      [ref, pickupCity, deliveryCity, material, weight, truck, date, contact, JSON.stringify(estimate), now]
    );

    const saved = db.formatQuoteRow(db.get('SELECT * FROM quotes WHERE ref = ?', [ref]));
    res.status(201).json({ message: 'Freight quotation request submitted.', quote: saved });
  });

  /* ================= 6. CONTACT FORM MESSAGES ================= */
  app.post('/api/contact', (req, res) => {
    const name = cleanStr(req.body.name);
    const mobile = cleanStr(req.body.mobile).replace(/[\s-]/g, '');
    const email = cleanStr(req.body.email).toLowerCase();
    const subject = cleanStr(req.body.subject);
    const message = cleanStr(req.body.message);

    if (!name || !subject || !message) {
      return res.status(400).json({ error: 'Name, subject and message are required.' });
    }
    if (!isValidMobile(mobile)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = db.run(
      'INSERT INTO messages (name, mobile, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, mobile, email, subject, message, 'UNREAD', now]
    );

    res.status(201).json({
      message: 'Your enquiry has been sent to RP TRANSPORT COMPANY.',
      id: lastInsertRowid
    });
  });

  /* ================= 7. PROTECTED ADMIN ENDPOINTS ================= */
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const bookings = db.all('SELECT * FROM bookings ORDER BY created_at DESC').map(db.formatBookingRow);
    const vehicles = db.all('SELECT * FROM vehicles ORDER BY id ASC');
    const quotes = db.all('SELECT * FROM quotes ORDER BY created_at DESC').map(db.formatQuoteRow);
    const messages = db.all('SELECT * FROM messages ORDER BY created_at DESC');

    const stats = {
      totalBookings: bookings.length,
      pendingBookings: bookings.filter(b => b.status === 'PENDING COMPANY CONFIRMATION').length,
      approvedBookings: bookings.filter(b => b.status === 'APPROVED' || b.status === 'VEHICLE ASSIGNED' || b.status === 'PICKED UP' || b.status === 'IN TRANSIT').length,
      completedBookings: bookings.filter(b => b.status === 'DELIVERED').length,
      totalQuotes: quotes.length,
      unreadMessages: messages.filter(m => m.status === 'UNREAD').length
    };

    res.json({ stats, bookings, vehicles, quotes, messages });
  });

  app.patch('/api/admin/bookings/:ref/approve', requireAdmin, (req, res) => {
    const ref = cleanStr(req.params.ref).toUpperCase();
    const row = db.get('SELECT * FROM bookings WHERE UPPER(ref) = ?', [ref]);
    if (!row) return res.status(404).json({ error: 'Booking not found.' });

    const history = JSON.parse(row.history_json || '[]');
    history.push({
      status: 'APPROVED',
      at: new Date().toISOString(),
      note: `Approved by ${req.user.name}`
    });
    db.run('UPDATE bookings SET status = ?, history_json = ? WHERE id = ?', ['APPROVED', JSON.stringify(history), row.id]);
    const updated = db.formatBookingRow(db.get('SELECT * FROM bookings WHERE id = ?', [row.id]));
    res.json({ message: `Booking ${updated.ref} approved.`, booking: updated });
  });

  app.patch('/api/admin/bookings/:ref/reject', requireAdmin, (req, res) => {
    const ref = cleanStr(req.params.ref).toUpperCase();
    const reason = cleanStr(req.body && req.body.reason);
    const row = db.get('SELECT * FROM bookings WHERE UPPER(ref) = ?', [ref]);
    if (!row) return res.status(404).json({ error: 'Booking not found.' });

    // Free any assigned vehicle
    if (row.vehicle_reg) {
      db.run("UPDATE vehicles SET availability = 'Available', assigned = '' WHERE reg = ?", [row.vehicle_reg], false);
    }

    const history = JSON.parse(row.history_json || '[]');
    history.push({
      status: 'REJECTED',
      at: new Date().toISOString(),
      note: reason ? `Rejected by ${req.user.name}: ${reason}` : `Rejected by ${req.user.name}`
    });
    db.run('UPDATE bookings SET status = ?, vehicle_reg = NULL, history_json = ? WHERE id = ?', ['REJECTED', JSON.stringify(history), row.id]);
    const updated = db.formatBookingRow(db.get('SELECT * FROM bookings WHERE id = ?', [row.id]));
    res.json({ message: `Booking ${updated.ref} rejected.`, booking: updated });
  });

  app.patch('/api/admin/bookings/:ref/assign', requireAdmin, (req, res) => {
    const ref = cleanStr(req.params.ref).toUpperCase();
    const vehicleId = cleanStr(req.body && req.body.vehicleId);
    const row = db.get('SELECT * FROM bookings WHERE UPPER(ref) = ?', [ref]);
    if (!row) return res.status(404).json({ error: 'Booking not found.' });

    const vehicle = db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) return res.status(404).json({ error: 'Selected vehicle not found in fleet.' });

    const nextStatus =
      row.status === 'PENDING COMPANY CONFIRMATION' || row.status === 'APPROVED' || row.status === 'REJECTED'
        ? 'VEHICLE ASSIGNED'
        : row.status;

    const history = JSON.parse(row.history_json || '[]');
    history.push({
      status: 'VEHICLE ASSIGNED',
      at: new Date().toISOString(),
      note: `Vehicle ${vehicle.reg} (${vehicle.driver}) assigned by ${req.user.name}`
    });

    db.run(
      'UPDATE bookings SET status = ?, vehicle_reg = ?, history_json = ? WHERE id = ?',
      [nextStatus, vehicle.reg, JSON.stringify(history), row.id],
      false
    );
    db.run(
      "UPDATE vehicles SET availability = 'On Trip', assigned = ? WHERE id = ?",
      [row.ref, vehicle.id]
    );

    const updated = db.formatBookingRow(db.get('SELECT * FROM bookings WHERE id = ?', [row.id]));
    res.json({ message: `Vehicle ${vehicle.reg} assigned to ${updated.ref}.`, booking: updated });
  });

  app.patch('/api/admin/bookings/:ref/status', requireAdmin, (req, res) => {
    const ref = cleanStr(req.params.ref).toUpperCase();
    const status = cleanStr(req.body && req.body.status).toUpperCase();
    const note = cleanStr(req.body && req.body.note);
    const eta = cleanStr(req.body && req.body.eta);

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    const row = db.get('SELECT * FROM bookings WHERE UPPER(ref) = ?', [ref]);
    if (!row) return res.status(404).json({ error: 'Booking not found.' });

    const history = JSON.parse(row.history_json || '[]');
    history.push({
      status,
      at: new Date().toISOString(),
      note: note || `Status updated to ${status} by ${req.user.name}`
    });

    const newEta = eta !== '' ? eta : row.eta;
    db.run(
      'UPDATE bookings SET status = ?, eta = ?, history_json = ? WHERE id = ?',
      [status, newEta || null, JSON.stringify(history), row.id],
      false
    );

    // If delivered or rejected, release the assigned truck back to Available
    if ((status === 'DELIVERED' || status === 'REJECTED') && row.vehicle_reg) {
      db.run("UPDATE vehicles SET availability = 'Available', assigned = '' WHERE reg = ?", [row.vehicle_reg], false);
    }
    db.persist();

    const updated = db.formatBookingRow(db.get('SELECT * FROM bookings WHERE id = ?', [row.id]));
    res.json({ message: `Status updated to ${status}.`, booking: updated });
  });

  /* ---------- Admin Fleet Management ---------- */
  app.post('/api/admin/vehicles', requireAdmin, (req, res) => {
    const reg = cleanStr(req.body.reg).toUpperCase();
    const type = cleanStr(req.body.type);
    const capacity = cleanStr(req.body.capacity);
    const driver = cleanStr(req.body.driver);
    const contact = cleanStr(req.body.contact).replace(/[\s-]/g, '');
    const availability = cleanStr(req.body.availability) || 'Available';
    const location = cleanStr(req.body.location);
    const assigned = cleanStr(req.body.assigned);

    if (!reg || !type || !capacity || !driver) {
      return res.status(400).json({ error: 'Registration number, vehicle type, capacity and driver name are required.' });
    }
    if (!isValidMobile(contact)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit driver contact number.' });
    }
    const dup = db.get('SELECT id FROM vehicles WHERE UPPER(reg) = ?', [reg]);
    if (dup) {
      return res.status(409).json({ error: `A vehicle with registration ${reg} already exists.` });
    }

    const id = db.nextVehicleId();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO vehicles (id, reg, type, capacity, driver, contact, availability, location, assigned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, reg, type, capacity, driver, contact, availability, location, assigned, now]
    );
    const vehicle = db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
    res.status(201).json({ message: 'Vehicle added to fleet.', vehicle });
  });

  app.put('/api/admin/vehicles/:id', requireAdmin, (req, res) => {
    const id = cleanStr(req.params.id);
    const existing = db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found.' });

    const reg = cleanStr(req.body.reg).toUpperCase();
    const type = cleanStr(req.body.type);
    const capacity = cleanStr(req.body.capacity);
    const driver = cleanStr(req.body.driver);
    const contact = cleanStr(req.body.contact).replace(/[\s-]/g, '');
    const availability = cleanStr(req.body.availability) || 'Available';
    const location = cleanStr(req.body.location);
    const assigned = cleanStr(req.body.assigned);

    if (!reg || !type || !capacity || !driver) {
      return res.status(400).json({ error: 'Registration number, vehicle type, capacity and driver name are required.' });
    }
    if (!isValidMobile(contact)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit driver contact number.' });
    }
    const dup = db.get('SELECT id FROM vehicles WHERE UPPER(reg) = ? AND id != ?', [reg, id]);
    if (dup) {
      return res.status(409).json({ error: `Another vehicle with registration ${reg} already exists.` });
    }

    db.run(
      'UPDATE vehicles SET reg = ?, type = ?, capacity = ?, driver = ?, contact = ?, availability = ?, location = ?, assigned = ? WHERE id = ?',
      [reg, type, capacity, driver, contact, availability, location, assigned, id]
    );
    const vehicle = db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
    res.json({ message: 'Vehicle updated.', vehicle });
  });

  app.delete('/api/admin/vehicles/:id', requireAdmin, (req, res) => {
    const id = cleanStr(req.params.id);
    const existing = db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found.' });

    db.run('DELETE FROM vehicles WHERE id = ?', [id]);
    res.json({ message: 'Vehicle removed from fleet.' });
  });

  /* ---------- Admin Quotations & Contact Messages ---------- */
  app.patch('/api/admin/quotes/:ref', requireAdmin, (req, res) => {
    const ref = cleanStr(req.params.ref).toUpperCase();
    const status = cleanStr(req.body.status) || 'QUOTATION SENT';
    const adminNote = cleanStr(req.body.adminNote);
    const row = db.get('SELECT * FROM quotes WHERE UPPER(ref) = ?', [ref]);
    if (!row) return res.status(404).json({ error: 'Quotation request not found.' });

    db.run('UPDATE quotes SET status = ?, admin_note = ? WHERE id = ?', [status, adminNote, row.id]);
    res.json({ message: `Quotation ${row.ref} updated.`, quote: db.formatQuoteRow(db.get('SELECT * FROM quotes WHERE id = ?', [row.id])) });
  });

  app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const status = cleanStr(req.body.status) || 'RESOLVED';
    const row = db.get('SELECT * FROM messages WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Message not found.' });

    db.run('UPDATE messages SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Message status updated.', item: db.get('SELECT * FROM messages WHERE id = ?', [id]) });
  });

  /* ================= 8. STATIC FRONTEND ================= */
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Unknown API route handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return { app, db };
}

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 8080;
  const HOST = process.env.HOST || '0.0.0.0';
  createApp()
    .then(({ app }) => {
      app.listen(PORT, HOST, () => {
        console.log(`RPTC Full-Stack Server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = { createApp };
