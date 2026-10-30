# RP TRANSPORT COMPANY (RPTC) — Full-Stack Transport Management System

Full-stack Online Truck Booking, Shipment Tracking, Freight Quotation & Fleet Management Web Application built with **Node.js + Express + SQLite + Vanilla HTML/CSS/JS**.

---

## Quick Start (How to Run Locally)

### Prerequisites
- **Node.js** `v18` or newer installed on your PC ([nodejs.org](https://nodejs.org))

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Website & Backend Server
```bash
npm start
```
Open your browser at: **`http://localhost:8080`**

*(No separate database server installation is needed — the SQLite database file `data/rptc.sqlite` is automatically created and seeded on first run!)*

---

## Default Login Credentials

### Admin Portal (`http://localhost:8080/admin.html`)
- **Email:** `admin@rptc.in`
- **Password:** `Admin@123`

*(To customize admin credentials or JWT secret in production, copy `.env.example` to `.env` and edit `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET`.)*

### Sample Customer Account (`http://localhost:8080/login.html`)
- **Email:** `customer@rptc.in`
- **Password:** `Customer@123`
*(Or register any new customer account directly on `login.html`.)*

### Sample Tracking References (`http://localhost:8080/tracking.html`)
- `RPTC-2026-10001` *(Pending Confirmation)*
- `RPTC-2026-10002` *(In Transit — Vehicle Assigned)*
- `RPTC-2026-10003` *(Approved)*

---

## Project Structure

```text
├── server.js          # Express backend server, JWT auth & REST API routes
├── db.js              # SQLite database initialization, schema & persistence
├── data/              # Auto-generated SQLite database (rptc.sqlite)
├── public/            # Frontend pages, stylesheet (style.css) & client logic (script.js)
│   ├── index.html     # Home page + live fleet availability check
│   ├── booking.html   # Online truck booking + freight quotation request
│   ├── tracking.html  # Real-time shipment status & 6-step progress timeline
│   ├── login.html     # Customer login, registration & "My Bookings" portal
│   ├── admin.html     # Role-protected Admin Dashboard (bookings, quotes, enquiries, fleet)
│   ├── services.html  # Detailed logistics services & truck capacity chart
│   ├── about.html     # Company profile
│   └── contact.html   # Contact form connected to backend + office map
└── tests/
    └── api.test.js    # Automated end-to-end API & database persistence tests
```

---

## REST API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server & SQLite health check |
| `POST` | `/api/auth/register` | Public | Customer account registration (`bcrypt` + JWT) |
| `POST` | `/api/auth/login` | Public | Customer / Admin login |
| `POST` | `/api/auth/logout` | Public | Clear session |
| `GET` | `/api/auth/me` | Public | Current logged-in user profile |
| `POST` | `/api/availability` | Public | Check live truck availability in fleet DB |
| `POST` | `/api/bookings` | Public | Submit online truck booking (`RPTC-YYYY-NNNNN`) |
| `GET` | `/api/bookings/track/:ref` | Public | Track shipment status & history by reference |
| `GET` | `/api/bookings/my` | Customer | List logged-in customer's bookings |
| `POST` | `/api/quotes` | Public | Request freight quotation (`RPTC-Q-YYYY-NNNN`) |
| `POST` | `/api/contact` | Public | Submit contact enquiry |
| `GET` | `/api/admin/dashboard` | Admin | Live stats, bookings, quotes, enquiries & fleet |
| `PATCH` | `/api/admin/bookings/:ref/approve` | Admin | Approve booking request |
| `PATCH` | `/api/admin/bookings/:ref/reject` | Admin | Reject booking request |
| `PATCH` | `/api/admin/bookings/:ref/assign` | Admin | Assign fleet truck & driver to booking |
| `PATCH` | `/api/admin/bookings/:ref/status` | Admin | Update shipment status & ETA |
| `POST` | `/api/admin/vehicles` | Admin | Add truck to fleet |
| `PUT` | `/api/admin/vehicles/:id` | Admin | Update fleet truck details |
| `DELETE` | `/api/admin/vehicles/:id` | Admin | Remove truck from fleet |
| `PATCH` | `/api/admin/quotes/:ref` | Admin | Update freight quotation status & note |
| `PATCH` | `/api/admin/messages/:id` | Admin | Mark contact enquiry resolved/unread |

---

## Run Tests
```bash
npm test
```
