# Blood Bank Management Web App

A full-stack web application for managing blood bank operations — donors, inventory, donations, blood requests, donation camps, and reporting.

Built with **Django REST Framework** (backend) and **React + TypeScript** (frontend).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 4.2, Django REST Framework, PostgreSQL |
| Auth | JWT (SimpleJWT) — access + refresh tokens |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Redux Toolkit |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| HTTP | Axios |

---

## Features

### Roles
| Role | Access |
|------|--------|
| **ADMIN** | Full access — users, donors, inventory, donations, requests, reports, camps |
| **STAFF** | Same as ADMIN except user management |
| **DONOR** | My Profile, Donations (own history), Blood Requests, Camps |
| **HOSPITAL** | Blood Requests, Blood Camps (create/manage own) |

### Modules

**Dashboard** — KPI cards (donors, inventory, pending requests, monthly donations), expiry alerts, low-stock warnings, live camps widget.

**Donors** — Searchable donor list with blood group / city / eligibility filters. Eligibility computed from last donation date (56-day WHO guideline).

**Inventory** — Blood unit tracking with batch number, component type (Whole Blood / RBC / Platelets / Plasma), expiry date, storage location, status (Available / Reserved / Used / Expired / Discarded).

**Donations** — Full donation lifecycle (Scheduled → Completed / Cancelled / Rejected). Donors see their own history; Admin/Staff see all.

**Blood Requests** — Urgency levels (Routine / Urgent / Critical), partial fulfilment tracking, overdue detection.

**Blood Donation Camps** — Create and manage donation camps with location, dates, live status (Upcoming / Live / Completed / Cancelled). Status auto-computed from current date.

**Reports** — Donation trends, inventory by blood group, donor distribution by city/blood group, request fulfilment rates.

**My Profile** (Donor) — Complete profile setup on first login, edit contact info, view donation history.

---

## Project Structure

```
bloodbank-management/
├── backend/                  Django project
│   ├── bloodbank/
│   │   ├── apps/
│   │   │   ├── accounts/     User model, JWT auth, registration
│   │   │   ├── donors/       DonorProfile, eligibility logic
│   │   │   ├── inventory/    BloodUnit model
│   │   │   ├── donations/    Donation lifecycle
│   │   │   ├── requests/     BloodRequest model
│   │   │   ├── camps/        DonationCamp model
│   │   │   ├── reports/      Aggregated analytics endpoints
│   │   │   └── core/         Management commands (seed_data, seed_camps)
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   └── development.py
│   │   └── urls.py
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 React + Vite app
│   ├── src/
│   │   ├── api/              Axios client + per-module API helpers
│   │   ├── features/         Page components (dashboard, donors, inventory …)
│   │   ├── components/       Shared UI (AppShell, Sidebar, ProtectedRoute)
│   │   ├── hooks/            useAuth, useRole
│   │   ├── store/            Redux slices
│   │   ├── types/            Shared TypeScript types
│   │   └── router.tsx        React Router v6 with role-based guards
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env            # then edit .env with your DB credentials

# Run migrations
python manage.py migrate

# Seed sample data (optional)
python manage.py seed_data
python manage.py seed_camps

# Start dev server
python manage.py runserver
```

API runs at `http://localhost:8000`

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## Environment Variables

Create `backend/.env`:

```env
DJANGO_SECRET_KEY=your-secret-key-here
DB_NAME=bloodbank_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## API Overview

Base URL: `http://localhost:8000/api/v1/`

| Endpoint | Description |
|----------|-------------|
| `POST auth/login/` | JWT login |
| `POST auth/refresh/` | Refresh access token |
| `POST auth/logout/` | Blacklist refresh token |
| `POST accounts/register/` | New user registration |
| `GET/PATCH donors/me/` | Donor's own profile |
| `GET donors/` | List all donors (Admin/Staff) |
| `GET inventory/` | Blood unit list |
| `GET/POST donations/` | Donations (Admin/Staff) |
| `GET donations/my-history/` | Donor's own donations |
| `GET/POST requests/` | Blood requests |
| `GET camps/` | Donation camps list |
| `GET camps/live/` | Today's live camps |
| `GET reports/dashboard/` | Dashboard statistics |

---

## Seed Accounts

After running `python manage.py seed_data` the following accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bloodbank.com | Admin@1234 |
| Staff | staff@bloodbank.com | Staff@1234 |
| Donor | donor1@example.com | Donor@1234 |
| Hospital | apollo@hospital.com | Hospital@1234 |

---

## Running Tests

```bash
cd backend
python manage.py test bloodbank.apps.donors.tests --verbosity=2
```

---

## Docker

```bash
docker-compose up --build
```

---

## License

MIT
