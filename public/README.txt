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

PROJECT FILES
-------------
  index.html     Home page — hero, quick truck booking form (simulated
                 availability), company highlights, 10 service cards,
                 why-choose-us, 4-step process, sample testimonials, footer.
  booking.html   Full online truck booking form (customer / pickup / delivery /
                 goods / truck / payment sections) + freight quotation form.
                 Generates a booking reference (e.g. RPTC-2026-10001),
                 shows a booking summary and offers Print Booking.
  tracking.html  Shipment tracking by booking reference with a 6-step visual
                 progress timeline (request received → approved → vehicle
                 assigned → picked up → in transit → delivered).
  services.html  Detailed descriptions of all 10 services, vehicle type /
                 capacity table and industries served.
  about.html     Company profile, mission / vision / values, business details.
  contact.html   Contact details, click-to-call buttons, WhatsApp button,
                 validated contact form and Google Map embed (Kalamboli).
  login.html     Customer login & registration (DEMO ONLY — see security note).
  admin.html     DEMO admin dashboard — statistics, booking management table
                 (view / approve / reject / assign vehicle / update status /
                 print) and demo vehicle & fleet management (add / edit /
                 remove). Sample data is clearly labelled.
  style.css      Shared stylesheet (corporate palette, components, responsive
                 breakpoints, print styles).
  script.js      Shared vanilla JavaScript (navigation, validation, toasts,
                 LocalStorage demo data, booking / quotation / tracking /
                 contact / auth / admin logic, print helper).

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

IMPORTANT — WHAT IS REAL AND WHAT IS DEMO
-----------------------------------------
  REAL (fully working in this package):
    - All page navigation, mobile hamburger menu, responsive layout.
    - Form validation with inline error messages and toast notifications.
    - Booking reference generation (RPTC-YYYY-NNNNN).
    - Booking request submission, summary and Print Booking.
    - Freight quotation request with clearly-labelled ILLUSTRATIVE estimate.
    - Shipment tracking lookup + visual progress timeline.
    - Contact form validation, click-to-call (tel:) links, WhatsApp links.
    - Demo admin dashboard actions and demo fleet management (add/edit/
      remove vehicles).

  DEMONSTRATION ONLY (not real business data or real operations):
    - "Check Truck Availability" on the home page is a SIMULATED result.
      It does NOT confirm that a real truck is available.
    - The freight estimate is an ILLUSTRATIVE SAMPLE — not a valid quote.
      Real freight requires verified pricing rules and route information.
    - Booking status changes on the admin page are demo actions.
    - Shipments are NEVER auto-marked as picked up / in transit / delivered;
      only authorized updates change status.
    - Testimonials are clearly marked SAMPLE / demo content.
    - Statistics shown are computed from demo records — no verified customer
      counts, delivery totals or company achievements are claimed.

  LOCALSTORAGE NOTICE:
    All bookings, quotations, vehicles, users and messages are stored ONLY
    in the browser's LocalStorage. This data is:
      - specific to that browser and that device,
      - NOT shared between users, devices or browsers,
      - lost if browser data is cleared.
    Real multi-user booking requires a backend API and a database.

  SECURITY NOTICES:
    - login.html uses LocalStorage-based demo authentication. It is NOT
      secure and must NOT be used for real customer accounts. Production
      requires a secure backend, password hashing, session management and
      access controls.
    - admin.html is a PUBLICLY ACCESSIBLE demo page with no login. Real
      administration must use backend authentication, role-based
      authorization and server-side data validation.
    - The contact form does NOT actually deliver messages anywhere; it
      stores them locally for demo. Connect a backend or form service for
      real delivery.

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
    shipments.
  - Database (e.g. PostgreSQL / MySQL / MongoDB) with backups and error
    logging.
  - Secure customer and administrator authentication (hashed passwords,
    sessions / JWT, role-based access control).
  - Server-side booking validation and authorized booking approval.
  - Real vehicle availability management from a verified fleet database.
  - Shipment status history with authorized updates.
  - Email / SMS notifications (booking confirmation, status updates).
  - Payment gateway integration, if required.
  - GPS integration for real-time vehicle tracking.
  - Secure document / invoice / e-way bill management.

  The frontend is structured so these can be connected later without
  redesigning the UI: all demo data access goes through the getData /
  setData helpers and the KEYS object at the top of script.js.

TROUBLESHOOTING
---------------
  - If pages look unstyled, make sure style.css is in the same folder and
    the browser did not block local files.
  - If a feature seems not to work, open the browser console (F12) and
    check for JavaScript errors.
  - If tracking says "not found", submit a booking first on booking.html,
    or try the sample reference RPTC-2026-10001.

Copyright © 2026 RP TRANSPORT COMPANY (RPTC). All rights reserved.
This package is a frontend demonstration of a transport management system.
================================================================================
