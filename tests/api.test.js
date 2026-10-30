const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');

async function runTests() {
  const tmpDb = path.join(os.tmpdir(), `rptc-test-${Date.now()}.sqlite`);
  const { app } = await createApp(tmpDb);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function req(endpoint, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const res = await fetch(base + endpoint, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  try {
    // 1. Health check
    const health = await req('/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.ok, true);

    // 2. Unauthenticated admin access must be blocked (401)
    const unauthAdmin = await req('/api/admin/dashboard');
    assert.strictEqual(unauthAdmin.status, 401);

    // 3. Customer registration + login + non-admin blocked from /api/admin (403)
    const reg = await req('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Customer',
        email: 'testcustomer@example.com',
        mobile: '9876543210',
        password: 'Password123'
      }
    });
    assert.strictEqual(reg.status, 201);
    assert.ok(reg.data.token);
    assert.strictEqual(reg.data.user.role, 'customer');

    const custToken = reg.data.token;
    const forbiddenAdmin = await req('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assert.strictEqual(forbiddenAdmin.status, 403);

    // 4. Create truck booking as logged-in customer
    const createBk = await req('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: {
        customer: { name: 'Test Customer', company: 'ABC Traders', mobile: '9876543210', email: 'testcustomer@example.com', gst: '' },
        pickup: { address: 'Plot 12, Kalamboli', city: 'Navi Mumbai', state: 'Maharashtra', pin: '410218', date: '2026-12-25', time: '09:00 – 12:00' },
        delivery: { address: 'Naroda GIDC', city: 'Ahmedabad', state: 'Gujarat', pin: '382330' },
        goods: { material: 'Steel Pipes', category: 'General', weight: '12', packages: '40', dimensions: '', handling: 'Use crane' },
        vehicle: { type: 'Open Body Truck', capacity: '16 T' },
        payment: { freight: 'Sender Pays', advance: 'Yes', instructions: 'Call before arrival' }
      }
    });
    assert.strictEqual(createBk.status, 201);
    const bookingRef = createBk.data.booking.ref;
    assert.match(bookingRef, /^RPTC-\d{4}-\d+$/);

    // 5. Customer "My Bookings" includes newly created booking
    const myBks = await req('/api/bookings/my', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    assert.strictEqual(myBks.status, 200);
    assert.ok(myBks.data.bookings.some(b => b.ref === bookingRef));

    // 6. Public shipment tracking works
    const track1 = await req(`/api/bookings/track/${bookingRef}`);
    assert.strictEqual(track1.status, 200);
    assert.strictEqual(track1.data.booking.status, 'PENDING COMPANY CONFIRMATION');

    // 7. Freight quotation & Contact message
    const quoteRes = await req('/api/quotes', {
      method: 'POST',
      body: {
        pickupCity: 'Mumbai',
        deliveryCity: 'Bengaluru',
        material: 'Electronics',
        weight: '7.5',
        truck: 'Container Truck',
        date: '2026-12-28',
        contact: '9876543210'
      }
    });
    assert.strictEqual(quoteRes.status, 201);
    assert.match(quoteRes.data.quote.ref, /^RPTC-Q-\d{4}-\d+$/);

    const contactRes = await req('/api/contact', {
      method: 'POST',
      body: {
        name: 'Test Customer',
        mobile: '9876543210',
        email: 'testcustomer@example.com',
        subject: 'Monthly Contract Enquiry',
        message: 'Need 4 container trucks monthly from Kalamboli to Pune.'
      }
    });
    assert.strictEqual(contactRes.status, 201);

    // 8. Admin login & full management lifecycle
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@rptc.in', password: 'Admin@123' }
    });
    assert.strictEqual(adminLogin.status, 200);
    assert.strictEqual(adminLogin.data.user.role, 'admin');
    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const dash = await req('/api/admin/dashboard', { headers: adminHeaders });
    assert.strictEqual(dash.status, 200);
    assert.ok(dash.data.bookings.some(b => b.ref === bookingRef));
    assert.strictEqual(dash.data.stats.unreadMessages, 1);

    // Add vehicle -> assign to booking -> update status -> verify tracking
    const addVeh = await req('/api/admin/vehicles', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        reg: 'MH-46-ZZ-9999',
        type: 'Open Body Truck',
        capacity: '16 T',
        driver: 'Rajesh Yadav',
        contact: '9123456789',
        availability: 'Available',
        location: 'Kalamboli, Navi Mumbai'
      }
    });
    assert.strictEqual(addVeh.status, 201);
    const vehicleId = addVeh.data.vehicle.id;

    const approveRes = await req(`/api/admin/bookings/${bookingRef}/approve`, {
      method: 'PATCH',
      headers: adminHeaders
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.booking.status, 'APPROVED');

    const assignRes = await req(`/api/admin/bookings/${bookingRef}/assign`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { vehicleId }
    });
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.data.booking.vehicleReg, 'MH-46-ZZ-9999');

    const statusRes = await req(`/api/admin/bookings/${bookingRef}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { status: 'IN TRANSIT', eta: '2026-12-27', note: 'Crossed Vapi checkpost' }
    });
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.booking.status, 'IN TRANSIT');

    const track2 = await req(`/api/bookings/track/${bookingRef}`);
    assert.strictEqual(track2.data.booking.status, 'IN TRANSIT');
    assert.strictEqual(track2.data.booking.vehicleReg, 'MH-46-ZZ-9999');
    assert.strictEqual(track2.data.booking.eta, '2026-12-27');

    // 9. Verify SQLite file persisted on disk and survives fresh app reload
    assert.ok(fs.existsSync(tmpDb));
    const reloaded = await createApp(tmpDb);
    const persistedRow = reloaded.db.get('SELECT status, vehicle_reg FROM bookings WHERE ref = ?', [bookingRef]);
    assert.strictEqual(persistedRow.status, 'IN TRANSIT');
    assert.strictEqual(persistedRow.vehicle_reg, 'MH-46-ZZ-9999');

    console.log('ALL 9 END-TO-END API & SQLITE PERSISTENCE TESTS PASSED!');
  } finally {
    server.close();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  }
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
