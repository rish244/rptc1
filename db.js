const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

const DEFAULT_DB_PATH = path.join(__dirname, 'data', 'rptc.sqlite');

async function createDatabase(customDbPath) {
  const dbPath = customDbPath || process.env.DB_PATH || DEFAULT_DB_PATH;
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();
  let sqlDb;
  const isNewFile = !fs.existsSync(dbPath);
  if (!isNewFile) {
    const fileBuf = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuf);
  } else {
    sqlDb = new SQL.Database();
  }

  function persist() {
    const data = sqlDb.export();
    const tmpPath = dbPath + '.tmp';
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.renameSync(tmpPath, dbPath);
  }

  function all(sql, params = []) {
    const stmt = sqlDb.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  function get(sql, params = []) {
    const rows = all(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  function run(sql, params = [], shouldPersist = true) {
    sqlDb.run(sql, params);
    const lastRow = get('SELECT last_insert_rowid() AS id');
    if (shouldPersist) persist();
    return { lastInsertRowid: lastRow ? lastRow.id : null };
  }

  // Initialize relational schema
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      reg TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      capacity TEXT NOT NULL,
      driver TEXT NOT NULL,
      contact TEXT NOT NULL,
      availability TEXT NOT NULL DEFAULT 'Available',
      location TEXT DEFAULT '',
      assigned TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      sample INTEGER NOT NULL DEFAULT 0,
      customer_json TEXT NOT NULL,
      pickup_json TEXT NOT NULL,
      delivery_json TEXT NOT NULL,
      goods_json TEXT NOT NULL,
      vehicle_json TEXT NOT NULL,
      payment_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING COMPANY CONFIRMATION',
      vehicle_reg TEXT,
      eta TEXT,
      history_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL UNIQUE,
      sample INTEGER NOT NULL DEFAULT 0,
      pickup_city TEXT NOT NULL,
      delivery_city TEXT NOT NULL,
      material TEXT NOT NULL,
      weight REAL NOT NULL,
      truck TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      contact TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AWAITING QUOTATION',
      estimate_json TEXT NOT NULL,
      admin_note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNREAD',
      created_at TEXT NOT NULL
    );
  `);

  // Ensure default Admin user exists
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@rptc.in').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'RPTC Admin';
  const now = new Date().toISOString();

  const existingAdmin = get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    run(
      'INSERT INTO users (name, email, mobile, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [adminName, adminEmail, '8828383122', hash, 'admin', now],
      false
    );
  }

  // Seed initial sample records only when database is brand new / empty
  const existingCustomer = get('SELECT id FROM users WHERE role = ?', ['customer']);
  if (!existingCustomer && isNewFile) {
    const custHash = bcrypt.hashSync('Customer@123', 10);
    run(
      'INSERT INTO users (name, email, mobile, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['Rahul Sharma', 'customer@rptc.in', '9820000010', custHash, 'customer', now],
      false
    );
  }

  const vehicleCount = get('SELECT COUNT(*) AS cnt FROM vehicles').cnt;
  if (vehicleCount === 0 && isNewFile) {
    const seedVehicles = [
      ['V-001', 'MH-46-BF-1001', 'Open Body Truck', '9 T', 'Suresh Kumar', '9000000001', 'Available', 'Kalamboli, Navi Mumbai', ''],
      ['V-002', 'MH-46-CD-2002', 'Container Truck', '7.5 T (20 ft)', 'Ramesh Patil', '9000000002', 'On Trip', 'Chennai (en route)', 'RPTC-2026-10002'],
      ['V-003', 'MH-46-EF-3003', 'Light Commercial Vehicle', '3.5 T', 'Anil Shinde', '9000000003', 'Available', 'Kalamboli, Navi Mumbai', ''],
      ['V-004', 'MH-46-GH-4004', 'Heavy Commercial Vehicle', '16 T (Multi-axle)', 'Vijay More', '9000000004', 'Maintenance', 'Workshop, Navi Mumbai', ''],
      ['V-005', 'MH-46-JK-5005', 'Container Truck', '16 T (32 ft MXL)', 'Mahesh Jadhav', '9000000005', 'Available', 'Kalamboli, Navi Mumbai', '']
    ];
    for (const v of seedVehicles) {
      run(
        'INSERT INTO vehicles (id, reg, type, capacity, driver, contact, availability, location, assigned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [...v, now],
        false
      );
    }
  }

  const bookingCount = get('SELECT COUNT(*) AS cnt FROM bookings').cnt;
  if (bookingCount === 0 && isNewFile) {
    const seedBookings = [
      {
        ref: 'RPTC-2026-10001',
        sample: 1,
        createdAt: '2026-10-20T09:30:00.000Z',
        customer: { name: 'Demo Customer — Mumbai', company: 'Sample Trading Co.', mobile: '9820000001', email: 'customer@rptc.in', gst: '' },
        pickup: { address: 'APMC Market, Vashi', city: 'Navi Mumbai', state: 'Maharashtra', pin: '400703', date: '2026-12-12', time: '09:00 – 12:00' },
        delivery: { address: 'Azadpur Mandi', city: 'Delhi', state: 'Delhi', pin: '110033' },
        goods: { material: 'Onions (Agricultural Produce)', category: 'Perishable', weight: '9', packages: '450', dimensions: '', handling: 'Keep covered, avoid stacking heavy load on top.' },
        vehicle: { type: 'Open Body Truck', capacity: '9 T' },
        payment: { freight: 'Sender Pays', advance: 'Yes', instructions: 'Sample booking request.' },
        status: 'PENDING COMPANY CONFIRMATION',
        vehicleReg: null,
        eta: null,
        history: [{ status: 'PENDING COMPANY CONFIRMATION', at: '2026-10-20T09:30:00.000Z', note: 'Booking request received' }]
      },
      {
        ref: 'RPTC-2026-10002',
        sample: 1,
        createdAt: '2026-10-22T11:00:00.000Z',
        customer: { name: 'Demo Customer — Pune', company: 'AutoTech Components', mobile: '9820000002', email: 'demo2@example.com', gst: '' },
        pickup: { address: 'Chakan Industrial Area', city: 'Pune', state: 'Maharashtra', pin: '410501', date: '2026-12-08', time: '06:00 – 09:00' },
        delivery: { address: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pin: '600040' },
        goods: { material: 'Automobile Parts', category: 'General', weight: '7', packages: '32', dimensions: '', handling: '' },
        vehicle: { type: 'Container Truck', capacity: '7.5 T (20 ft)' },
        payment: { freight: 'Receiver Pays', advance: 'No', instructions: '' },
        status: 'IN TRANSIT',
        vehicleReg: 'MH-46-CD-2002',
        eta: '2026-12-11',
        history: [
          { status: 'PENDING COMPANY CONFIRMATION', at: '2026-10-22T11:00:00.000Z', note: 'Booking request received' },
          { status: 'APPROVED', at: '2026-10-22T15:20:00.000Z', note: 'Approved by RPTC Admin' },
          { status: 'VEHICLE ASSIGNED', at: '2026-10-23T08:00:00.000Z', note: 'Vehicle MH-46-CD-2002 assigned' },
          { status: 'PICKED UP', at: '2026-10-24T07:10:00.000Z', note: 'Goods picked up from Chakan, Pune' },
          { status: 'IN TRANSIT', at: '2026-10-24T09:00:00.000Z', note: 'Shipment in transit on NH-48' }
        ]
      },
      {
        ref: 'RPTC-2026-10003',
        sample: 1,
        createdAt: '2026-10-25T16:45:00.000Z',
        customer: { name: 'Demo Customer — Nashik', company: 'Sample Steel Industries', mobile: '9820000003', email: '', gst: '' },
        pickup: { address: 'MIDC Satpur', city: 'Nashik', state: 'Maharashtra', pin: '422007', date: '2026-12-15', time: 'Flexible' },
        delivery: { address: 'Butibori MIDC', city: 'Nagpur', state: 'Maharashtra', pin: '441122' },
        goods: { material: 'Steel Coils', category: 'General', weight: '16', packages: '6', dimensions: '', handling: 'Use crane for loading.' },
        vehicle: { type: 'Heavy Commercial Vehicle', capacity: '16 T' },
        payment: { freight: 'Sender Pays', advance: 'Yes', instructions: '' },
        status: 'APPROVED',
        vehicleReg: null,
        eta: null,
        history: [
          { status: 'PENDING COMPANY CONFIRMATION', at: '2026-10-25T16:45:00.000Z', note: 'Booking request received' },
          { status: 'APPROVED', at: '2026-10-26T10:00:00.000Z', note: 'Approved by RPTC Admin' }
        ]
      }
    ];

    for (const b of seedBookings) {
      run(
        `INSERT INTO bookings (
          ref, user_id, sample, customer_json, pickup_json, delivery_json,
          goods_json, vehicle_json, payment_json, status, vehicle_reg, eta, history_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.ref,
          null,
          b.sample,
          JSON.stringify(b.customer),
          JSON.stringify(b.pickup),
          JSON.stringify(b.delivery),
          JSON.stringify(b.goods),
          JSON.stringify(b.vehicle),
          JSON.stringify(b.payment),
          b.status,
          b.vehicleReg,
          b.eta,
          JSON.stringify(b.history),
          b.createdAt
        ],
        false
      );
    }
  }

  const quoteCount = get('SELECT COUNT(*) AS cnt FROM quotes').cnt;
  if (quoteCount === 0 && isNewFile) {
    run(
      `INSERT INTO quotes (
        ref, sample, pickup_city, delivery_city, material, weight, truck, pickup_date, contact, status, estimate_json, admin_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'RPTC-Q-2026-0001',
        1,
        'Mumbai',
        'Jaipur',
        'FMCG Goods',
        5,
        'Open Body Truck',
        '2026-12-20',
        '9820000009',
        'AWAITING QUOTATION',
        JSON.stringify({ low: 15000, high: 20500, illustrative: true }),
        '',
        '2026-10-21T10:00:00.000Z'
      ],
      false
    );
  }

  persist();

  function formatBookingRow(row) {
    if (!row) return null;
    return {
      ref: row.ref,
      userId: row.user_id,
      sample: Boolean(row.sample),
      createdAt: row.created_at,
      customer: JSON.parse(row.customer_json),
      pickup: JSON.parse(row.pickup_json),
      delivery: JSON.parse(row.delivery_json),
      goods: JSON.parse(row.goods_json),
      vehicle: JSON.parse(row.vehicle_json),
      payment: JSON.parse(row.payment_json),
      status: row.status,
      vehicleReg: row.vehicle_reg || null,
      eta: row.eta || null,
      history: JSON.parse(row.history_json || '[]')
    };
  }

  function formatQuoteRow(row) {
    if (!row) return null;
    return {
      ref: row.ref,
      sample: Boolean(row.sample),
      createdAt: row.created_at,
      pickupCity: row.pickup_city,
      deliveryCity: row.delivery_city,
      material: row.material,
      weight: String(row.weight),
      truck: row.truck,
      date: row.pickup_date,
      contact: row.contact,
      status: row.status,
      estimate: JSON.parse(row.estimate_json),
      adminNote: row.admin_note || ''
    };
  }

  function nextBookingRef() {
    const year = new Date().getFullYear();
    let max = 10000;
    const rows = all('SELECT ref FROM bookings WHERE ref LIKE ?', [`RPTC-${year}-%`]);
    for (const r of rows) {
      const m = /^RPTC-(\d{4})-(\d+)$/.exec(r.ref);
      if (m && Number(m[1]) === year && Number(m[2]) > max) {
        max = Number(m[2]);
      }
    }
    return `RPTC-${year}-${max + 1}`;
  }

  function nextQuoteRef() {
    const year = new Date().getFullYear();
    let max = 0;
    const rows = all('SELECT ref FROM quotes WHERE ref LIKE ?', [`RPTC-Q-${year}-%`]);
    for (const r of rows) {
      const m = /^RPTC-Q-(\d{4})-(\d+)$/.exec(r.ref);
      if (m && Number(m[1]) === year && Number(m[2]) > max) {
        max = Number(m[2]);
      }
    }
    return `RPTC-Q-${year}-${String(max + 1).padStart(4, '0')}`;
  }

  function nextVehicleId() {
    let max = 0;
    const rows = all('SELECT id FROM vehicles');
    for (const r of rows) {
      const m = /^V-(\d+)$/.exec(r.id);
      if (m && Number(m[1]) > max) max = Number(m[1]);
    }
    return `V-${String(max + 1).padStart(3, '0')}`;
  }

  return {
    dbPath,
    all,
    get,
    run,
    persist,
    formatBookingRow,
    formatQuoteRow,
    nextBookingRef,
    nextQuoteRef,
    nextVehicleId
  };
}

module.exports = { createDatabase };
