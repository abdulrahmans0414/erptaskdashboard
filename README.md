# TaskGrid ERP — Setup & Feature Guide

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

## Registration / Signup Flow

### For New Employees (Users):
1. Go to login page → **"Request Access"** tab
2. Fill in name, email, password, department, branch, role
3. Submit → request goes to admin pending queue
4. **Wait for admin action** (see below)

### For Admin (Approving Requests):
Go to **Profile Menu (top-right) → Pending Registrations**

**Option A — Send OTP:**
1. Click "🔑 Send OTP" on a pending request
2. A 6-digit OTP is generated and shown to admin
3. Admin shares OTP with user (phone call / WhatsApp / email)
4. User goes to login page → **"Enter OTP"** tab → enters email + OTP → account activated

**Option B — Approve Directly:**
1. Click "✓ Approve Directly" → user account created immediately
2. User can login right away

**Reject:** Click "Add Note & Reject" → optionally add reason → confirm

---

## Role Permissions

| Role | Can Assign Tasks | Can Review Tasks | Sees All Tasks | User Management |
|------|:---:|:---:|:---:|:---:|
| admin | ✅ | ✅ | ✅ All | ✅ Full |
| branch-head | ❌ | ✅ Branch | ✅ Branch | 👁 View |
| department-head | ✅ Dept | ✅ Dept | ✅ Dept | 👁 View |
| hr | ✅ HR dept | ❌ | ✅ HR tasks | ❌ |
| employee/it/graphic | ❌ | ❌ | Own only | ❌ |

---

## Task Lifecycle

```
[Admin assigns] → pending
→ [Employee clicks Start] → in-progress
→ [Employee clicks Submit + note] → submitted
→ [Admin/DeptHead reviews] → approved ✅ OR rejected ❌
→ [If rejected] → Employee can Start again (new attempt)
```

---

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/signup` — Public self-registration request
- `POST /api/auth/verify-otp` — Verify OTP to activate account
- `GET  /api/auth/registration-status?email=` — Check request status
- `GET  /api/auth/pending-registrations` — Admin: list pending (+ query ?status=)
- `PUT  /api/auth/pending-registrations/:id/review` — Admin: send_otp | approve_direct | reject
- `POST /api/auth/register` — Admin: create user directly
- `GET  /api/auth/me` — Current user

### Tasks
- `GET  /api/tasks` — Get tasks (data isolated by role)
- `POST /api/tasks` — Create task (admin/dept-head)
- `PUT  /api/tasks/:id/start` — Start task
- `PUT  /api/tasks/:id/submit` — Submit task
- `PUT  /api/tasks/:id/review` — Approve/reject (admin/dept-head)
- `PUT  /api/tasks/:id/comment` — Add update/comment
- `GET  /api/tasks/dashboard/stats` — Dashboard stats
- `GET  /api/tasks/employees/summary` — Employee performance

### Users
- `GET  /api/users` — Get users (isolated by role)
- `POST /api/users` — Create user (admin)
- `PUT  /api/users/:id` — Update user (admin)
- `DELETE /api/users/:id` — Delete user (admin)
- `PUT  /api/users/avatar/:id` — Upload avatar

### Notifications
- `GET  /api/notifications` — Get notifications (with unreadCount)
- `PUT  /api/notifications/read-all` — Mark all read
- `PUT  /api/notifications/:id/read` — Mark one read
- `DELETE /api/notifications/:id` — Delete notification
