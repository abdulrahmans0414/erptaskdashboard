# 📧 Gmail OTP Setup Guide — TaskGrid ERP

## How the OTP Flow Works

```
User → Submits Register Form
         ↓
Admin → Sees notification → Clicks "Send OTP"
         ↓
📧 OTP automatically sent to User's Gmail (via Nodemailer)
         ↓
User → Enters OTP on "Verify OTP" tab
         ↓
✅ Account Created → Auto Login → Dashboard
```

---

## Step 1: Enable Gmail 2-Factor Authentication

1. Go to **myaccount.google.com**
2. Security → **2-Step Verification** → Turn ON

---

## Step 2: Generate Gmail App Password

1. Go to **myaccount.google.com**
2. Security → **App passwords** (only visible after 2FA is enabled)
3. Select app: **Mail**
4. Select device: **Other (Custom)** → type "TaskGrid ERP"
5. Click **Generate**
6. Copy the **16-character password** (e.g., `abcd efgh ijkl mnop`)

---

## Step 3: Update .env File

Open `backend/.env` and fill in:

```env
EMAIL_USER=spisitteam@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

> ⚠️ Remove spaces from the 16-char App Password
> ✅ Correct: `abcdefghijklmnop`
> ❌ Wrong:   `abcd efgh ijkl mnop`

---

## Step 4: Test

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Register a new user with a real Gmail
4. Login as Admin → Go to Admin Panel → Pending Registrations
5. Click **"Send OTP"** on the request
6. Check the user's Gmail inbox — OTP email arrives in seconds
7. User enters OTP → Account activated ✅

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Email not sending | Check EMAIL_USER and EMAIL_PASS in .env |
| "Invalid login" error | Regenerate App Password, ensure 2FA is ON |
| OTP not in inbox | Check Spam/Promotions folder |
| Email password wrong | Don't use Gmail login password — use App Password |

---

## What emails are sent?

| Trigger | Email Sent To |
|---------|---------------|
| Admin clicks "Send OTP" | User's Gmail with 6-digit OTP |
| Admin clicks "Approve Direct" | User's Gmail with welcome message |
| User verifies OTP successfully | User's Gmail with welcome message |

