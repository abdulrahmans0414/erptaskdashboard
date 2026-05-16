# TaskGrid ERP — Setup & Feature Guide

## 🚀 V2.0 Performance & Security Update (New)

We have recently upgraded the architecture to handle enterprise-level data volumes and ensure maximum security.

### ⚡ Performance Optimizations
- **Full Server-Side Logic**: Migrated all Pagination, Filtering, and Search logic from the Frontend to the Backend. This prevents UI flickering and browser crashes when handling thousands of tasks/users.
- **Event-Driven Real-time Sync**: Replaced inefficient polling with an **Event Bus + SSE (Server-Sent Events)** architecture. The server now only pushes data when a database change actually occurs, reducing CPU load by ~90%.
- **Silent Background Refresh**: Implemented a "Non-blocking" data sync. Users no longer see annoying loading spinners during background updates; the UI remains interactive while data updates silently.
- **Advanced Debouncing**: Integrated intelligent search debouncing to reduce redundant API calls and improve input responsiveness.

### 🛡️ Security & Stability
- **API Hardening**: Integrated **Helmet.js** for secure HTTP headers and **Express-Rate-Limit** to protect against Brute Force and DDoS attacks.
- **Data Integrity (Soft Delete)**: Implemented "Soft Deletion" for user accounts. Deactivating a user no longer breaks historical task records or performance reports.
- **Global Error Protection**: Added **React Error Boundaries** (Frontend) and **Global Error Middleware** (Backend) to prevent "White Screen" crashes and provide professional error recovery.
- **Granular Data Isolation**: Hardened backend queries to ensure users only see data belonging to their specific Department or Branch, even if they bypass the UI.

---

## Quick Start

### Backend
```bash
cd backend
npm install
# Edit .env with your MongoDB URI
npm run dev        # nodemon server.js
# OR
npm start          # node server.js

# Seed demo data:
node seed.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # runs on http://localhost:5173
```

---

## Role Permissions

| Role | Can Assign Tasks | Can Review Tasks | Sees All Tasks | User Management |
|------|:---:|:---:|:---:|:---:|
| **admin** | ✅ | ✅ | ✅ Global | ✅ Full (All) |
| **branch-head** | ❌ | ✅ Branch | ✅ Branch | 👁 View Branch |
| **department-head** | ✅ Dept | ✅ Dept | ✅ Dept | 👁 View Dept |
| **hr** | ✅ HR dept | ❌ | ✅ HR tasks | ❌ |
| **employee** | ❌ | ❌ | Own only | ❌ |

---

## Registration / Signup Flow

### For New Employees (Users):
1. Go to login page → **"Request Access"** tab
2. Fill in details → goes to admin pending queue
3. **Wait for admin action** (OTP verification or direct approval)

---

## API Endpoints (Core)

### 📊 Dashboard & Tasks
- `GET /api/tasks` — Paginated & filtered tasks (Search: `?search=`, `?status=`, `?page=`)
- `GET /api/tasks/dashboard/stats` — Real-time stats (Daily/Weekly/Monthly)
- `PUT /api/tasks/:id/review` — Approve/reject with real-time emitter

### 👥 User Management
- `GET /api/users` — Paginated user list with global stats (`total`, `active`, `admins`)
- `PUT /api/users/:id` — Update with real-time profile push
- `DELETE /api/users/:id` — Soft-delete (Deactivate)

### 🌐 Real-time
- `GET /api/realtime/stream` — Event-driven SSE stream for instant updates

---
*Built with ❤️ for High-Performance Teams.*
