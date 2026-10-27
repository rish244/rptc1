================================================================================
  RP TRANSPORT COMPANY (RPTC) — TRANSPORT MANAGEMENT SYSTEM & ONLINE TRUCK
  BOOKING WEBSITE (FRONTEND DEMONSTRATION)
  Tagline: WE DELIVER SAFE.
================================================================================

COMPANY DETAILS
---------------
  Company   : RP TRANSPORT COMPANY (RPTC)
  Type      : Fleet Owner & Transport Contractor
  Address   : D 5103, Bima Complex, Near Steel Market, Kalamboli,
              Navi Mumbai – 410218, Maharashtra, India
  Mobile    : +91 88283 83122  /  +91 77387 33177
  Email     : rptransportcompany28@gmail.com
  Area      : PAN India

LIVE WEBSITE (GITHUB PAGES)
---------------------------
  Public link : https://rish244.github.io/rptc1/
  Hosting     : GitHub Pages (free, HTTPS, no server needed)
  Source      : this repository's root folder (branch: main)
  Note        : any change pushed to the branch set in
                Settings > Pages is published automatically in 1-2 minutes.

WHAT IS NEW IN THIS VERSION
---------------------------
  1. BOOKING HISTORY (my-bookings.html)
     Every truck booking and quotation request is listed with its status,
     route, goods, assigned vehicle/driver, freight rate shared by the admin,
     payment status and the complete status timeline. Includes search, status
     filter, sorting, re-booking, cancellation request, "Track" shortcut and
     Lorry Receipt printing. When a customer is logged in, the page shows only
     their bookings (matched by account email / registered mobile) with a
     switch to view every record saved in this browser.

  2. SEPARATE ADMIN PROFILE & LOGIN (admin-login.html + admin.html)
     - Dedicated administrator login with its own session, separate from
       customer accounts.
     - Admin profile card + editing (name, designation, email, phones, office)
       and password change.
     - Admin can ACCEPT (approve) booking requests, reject with a reason,
       assign vehicle & driver, and update shipment status.
     - Admin can SHARE FREIGHT RATES on a booking and on quotation requests
       (amount, note, validity). The customer sees the rate in My Bookings.
     - Admin can CREATE A BOOKING REQUEST on behalf of a customer (office /
       phone booking) and optionally approve it immediately.
     - Quotation requests can be converted into bookings with one click.
     - Admin can record payment status (pending / advance received / fully paid)
       and e-way bill / invoice details.
     - Rate Card management (base fare, per-km, loading, doc fee, GST,
       detention) that feeds the public rate card page.
     - Fleet management (add / edit / remove vehicles), booking CSV export,
       recent activity feed and a "reset demo data" tool.

  3. TRANSPORT FEATURES ADDED
     - Public rate card + freight calculator (rate-card.html) with base fare,
       distance, round trip, loading, documentation, detention and GST.
     - Lorry Receipt / consignment note printing with consignor, consignee,
       vehicle, driver, freight, payment status, invoice and e-way bill fields.
     - Consignee name/mobile and invoice / e-way bill fields on the booking form.
     - Freight rate & driver/contact shown on shipment tracking.
     - Booking history and rate card links added to every page's navigation
       and footer; self-service tools section on the home page.

ADMIN DEMO LOGIN
----------------
  URL       : admin-login.html   (or open admin.html directly)
  Email     : admin@rptc.in
  Password  : Admin@123

  The password can be changed from Admin → My Profile → Change Password.
  These credentials are published on purpose so the demo can be tested.
  They are NOT secure — see the SECURITY NOTICES below.

PROJECT FILES
-------------
  index.html       Home page — hero, quick truck booking form (simulated
                   availability), highlights, services, why-choose-us, process,
                   self-service transport tools, sample testimonials, footer.
  booking.html     Full online truck booking form (customer / pickup / delivery
                   incl. consignee / goods / truck / payment, invoice & e-way
                   bill fields) + freight quotation form. Generates a booking
                   reference (e.g. RPTC-2026-10001), shows a booking summary,
                   Print Booking and a link to the booking history.
  my-bookings.html Booking history + quotation requests with live status,
                   admin-shared rates, status timeline, lorry receipt,
                   re-booking and cancellation request.
  rate-card.html   Truck-wise rate card (maintained from the admin profile) and
                   an interactive freight calculator with charge policies.
  tracking.html    Shipment tracking by booking reference with a 6-step visual
                   progress timeline, freight rate and driver details. Supports
                   ?ref=RPTC-... links from My Bookings.
  services.html    Detailed descriptions of all 10 services, vehicle type /
                   capacity table and industries served.
  about.html       Company profile, mission / vision / values, business details.
  contact.html     Contact details, click-to-call buttons, WhatsApp button,
                   validated contact form and Google Map embed (Kalamboli).
  login.html       Customer login & registration (DEMO ONLY). Shows the admin
                   login link and My Booking History after login.
  admin-login.html Separate administrator login page with demo credentials.
  admin.html       Admin dashboard — login gate, profile hero, tabs for
                   Overview, Bookings, Rate Requests, New Request, Rate Card,
                   Fleet and My Profile. All actions are demo/LocalStorage.
  style.css        Shared stylesheet (corporate palette, components, admin,
                   booking history, rate card/calculator, responsive, print).
  script.js        Shared vanilla JavaScript (navigation, validation, toasts,
                   LocalStorage data, booking / quotation / tracking / contact /
                   auth / admin / rate card / booking history / LR printing).

HOW TO RUN (Windows laptop / PC)
--------------------------------
  1. Copy this entire folder to your computer (keep all files together in
     one folder — do NOT separate them).
  2. No installation, build step or server is required.
  3. Double-click "index.html" — it opens in your default browser
     (Chrome, Edge, Firefox, etc.).
  4. All navigation between pages works via the menu, buttons and footer.
  5. Optional: to test on a phone, copy the folder to the phone and open
     index.html with a mobile browser, or serve the folder with any local
     static server (e.g. "python -m http.server" in the folder, then open
     http://localhost:8000 on any device on the same Wi-Fi).

  Requirements: any modern web browser with JavaScript enabled.
  Works on: Windows / macOS / Linux desktops, Android phones, iPhones.

QUICK TEST WALKTHROUGH
----------------------
  1. Open index.html → submit the quick booking form, or open booking.html and
     submit a full booking. Note the generated reference (RPTC-YYYY-NNNNN).
  2. Open my-bookings.html → the new booking appears with status "PENDING
     COMPANY CONFIRMATION" and "Freight rate awaited".
  3. Open admin-login.html → click "Fill demo credentials" → Login.
  4. In admin.html open Bookings → use the ₹ icon on the booking to send a
     freight rate, then the ✓ icon to accept it.
  5. Return to my-bookings.html → the rate, "Payment pending" and the new
     status appear. "View History" shows the full timeline; "Lorry Receipt"
     opens a printable consignment note.
  6. In admin.html open Rate Requests → send a rate on a quotation, or convert
     it to a booking. Open Rate Card → change rates → save → open
     rate-card.html and use the freight calculator.
  7. In admin.html open My Profile → edit the profile or change the password.
     "Reset Demo Data" restores the original sample records.

IMPORTANT — WHAT IS REAL AND WHAT IS DEMO
-----------------------------------------
  REAL (fully working in this package):
    - All page navigation, mobile hamburger menu, responsive layout.
    - Form validation with inline error messages and toast notifications.
    - Booking reference generation (RPTC-YYYY-NNNNN).
    - Booking request submission, summary and Print Booking.
    - Freight quotation request with clearly-labelled ILLUSTRATIVE estimate.
    - Shipment tracking lookup + visual progress timeline.
    - Booking history: search/filter/sort, status timeline, re-booking,
      cancellation request, lorry receipt printing.
    - Rate card & freight calculator using the rates saved in this browser.
    - Demo admin login, profile edit, password change, rate sharing, booking
      accept/reject/assignment/status updates, office booking creation,
      quotation conversion, payment/e-way bill records, CSV export, data reset.
    - Contact form validation, click-to-call (tel:) links, WhatsApp links.

  DEMONSTRATION ONLY (not real business data or real operations):
    - "Check Truck Availability" on the home page is a SIMULATED result.
      It does NOT confirm that a real truck is available.
    - Freight estimates and the rate card are INDICATIVE DEMO VALUES — not
      valid quotations. Real freight requires verified pricing rules, route
      information and office approval.
    - Admin-shared rates, approvals, payments and status changes are demo
      actions stored in the browser only; nothing is sent to the company.
    - Shipments are NEVER auto-marked as picked up / in transit / delivered;
      only authorized updates change status.
    - The lorry receipt is a demo document — it is not a valid transport
      document, e-way bill or tax invoice.
    - Testimonials are clearly marked SAMPLE / demo content.
    - Statistics shown are computed from demo records — no verified customer
      counts, delivery totals or company achievements are claimed.

  LOCALSTORAGE NOTICE:
    All bookings, quotations, vehicles, users, messages, rate card values,
    admin profile/credentials and sessions are stored ONLY in the browser's
    LocalStorage. This data is:
      - specific to that browser and that device,
      - NOT shared between users, devices or browsers,
      - lost if browser data is cleared.
    Admin and customer sessions on different browsers/devices do not share
    data. Real multi-user booking requires a backend API and a database.

  SECURITY NOTICES:
    - login.html and admin-login.html use LocalStorage-based demo
      authentication. They are NOT secure and must NOT be used for real
      accounts. Passwords (including the admin password) are stored in plain
      text locally. Production requires a secure backend, password hashing,
      session management and access controls.
    - The demo admin credentials are published in the page and in this README
      on purpose. Never deploy this package as a real administration system.
    - Admin actions (approvals, rates, payments) are performed in the browser
      with no server-side validation or audit trail.
    - The contact form does NOT actually deliver messages anywhere; it stores
      them locally for demo. Connect a backend or form service for real
      delivery.
    - Invoice / e-way bill fields are record-keeping placeholders. Verify all
      statutory requirements with the RPTC accounts team.

  WHATSAPP NOTICE:
    WhatsApp buttons currently use +91 88283 83122 (wa.me/918828383122).
    Before publishing, verify which company number is registered with
    WhatsApp Business and update COMPANY.whatsapp in script.js and the
    wa.me links if needed.

  MAP NOTICE:
    The contact page embeds a Google Map for the Kalamboli / Navi Mumbai
    office area using the keyless "output=embed" URL. Verify the exact
    location pin with the company before publishing.

PRODUCTION UPGRADE PATH (recommended backend components)
--------------------------------------------------------
  - Backend API for bookings, quotations, customers, vehicles, drivers and
    shipments, with a database (PostgreSQL / MySQL / MongoDB), backups and
    error logging.
  - Secure customer and administrator authentication (hashed passwords,
    sessions / JWT, role-based access control, admin audit log).
  - Server-side booking validation and authorized booking approval, with
    approval history and customer notifications.
  - Freight rate management: rate rules by lane/vehicle/weight, versioned
    rate cards, written quotations with validity and approval workflow.
  - Rate sharing to customers (email / SMS / WhatsApp) and acceptance flow.
  - Real vehicle availability and driver assignment from a verified fleet
    database, with trip sheets and expense tracking.
  - Shipment status history with authorized updates and proof of delivery.
  - E-way bill / e-invoice / LR document integration, invoice and payment
    gateway, POD uploads.
  - GPS integration for real-time vehicle tracking.
  - Customer portal with secure account-based booking history.
  - Email / SMS notifications (booking confirmation, rate shared, status).

  The frontend is structured so these can be connected later without
  redesigning the UI: all demo data access goes through the getData /
  setData helpers and the KEYS object near the top of script.js.

TROUBLESHOOTING
---------------
  - If pages look unstyled, make sure style.css is in the same folder and
    the browser did not block local files.
  - If a feature seems not to work, open the browser console (F12) and
    check for JavaScript errors.
  - If tracking says "not found", submit a booking first on booking.html,
    or try the sample reference RPTC-2026-10001.
  - If the admin dashboard asks for login, use admin@rptc.in / Admin@123
    (or click "Fill demo credentials").
  - If My Bookings looks empty while logged in, use the "Show all records in
    this browser" switch — bookings are matched by account email/mobile.
  - If rates look different from this README, the admin has saved custom
    values in this browser; use Admin → Rate Card → Restore Defaults.

Copyright © 2026 RP TRANSPORT COMPANY (RPTC). All rights reserved.
This package is a frontend demonstration of a transport management system.
================================================================================
