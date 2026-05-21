# Enterprise SaaS ERP: Full Repository Git Ledger & Code Architecture Map

This ledger provides a detailed, commit-by-commit map of every single code modification, file change, and architectural upgrade made in the repository since its creation from scratch. It directly links Git history to the exact files affected and their core functionality.

---

## 🏛️ Comprehensive Git Commit Ledger

### 1. Root Architectural Hardening & Performance Foundations

#### 🏷️ Commit `4fd4def`: Deep Architectural Optimization & Bug Resolution
* **Target Files Modified**:
  - [`backend/controllers/auth/authController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/auth/authController.js) (Resolved path routing imports)
  - [`backend/controllers/tasks/taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js) (Upgraded aggregations with index matches)
  - [`backend/middleware/csrfMiddleware.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/middleware/csrfMiddleware.js) (Removed outdated cookie/csurf middleware)
  - [`backend/models/Task.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Task.js) (Added MongoDB compound indices on `assignedTo` and `status`)
  - [`frontend/src/components/Tasks/Tasks.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/Tasks.jsx) (Corrected Redux action paths)
  - [`frontend/src/hooks/useRealtimeSync.js`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/hooks/useRealtimeSync.js) (Optimized invalidation logic)
* **Architecture Detail**:
  - **Security Cleanup**: Removed CSRF/cookie parsing because Node 25 compatibility issues were crashing token handshakes. Replaced with stateless JWT authentication inside HTTP authorization headers.
  - **Performance Upgrades**: Added compound index definitions on Task models for fast search performance over 5000+ items.
  - **Aggregations Tuning**: Refactored `getEmployeeSummary` to use `$setUnion` to avoid duplicate task counts across single/team assignments.

#### 🏷️ Commit `994dc59`: Login Crash Resolution
* **Target Files Modified**:
  - [`backend/server.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/server.js)
  - [`backend/utils/validationRules.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/utils/validationRules.js)
* **Architecture Detail**:
  - **Input Sanitization**: Upgraded the `validateLogin` middleware array to allow both email addresses and custom unique `employeeId` inputs seamlessly.
  - **Error Handling**: Ensured that the global express error handler re-injects standard CORS headers on `500 Internal Server Error` responses, preventing browser CORS blockages during backend failures.

#### 🏷️ Commit `605f13f`: Seeding Optimization & Form Sync
* **Target Files Modified**:
  - [`backend/controllers/auth/authController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/auth/authController.js)
  - [`backend/logger.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/logger.js) (Introduced professional winston-logger streams)
  - [`backend/models/User.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/User.js)
  - [`backend/seed.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/seed.js)
* **Architecture Detail**:
  - **Seeding Balance**: Configured the default database seed schema to spin up 185 unique mock tasks mapped across multiple departments and branches.
  - **Sync Safeguard**: Fixed the registration controller to prevent orphan user profiles by dynamically mapping `employeeId` and `phone` inputs during signup validation.

---

### 📡 2. Real-Time Engine, Cloudinary CDN & IMAP Services

#### 🏷️ Commit `e0e3fbf`: Critical ERP Network Hardening
* **Target Files Modified**:
  - [`backend/utils/gmailImapService.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/utils/gmailImapService.js) (Corrected IMAP socket disconnect streams)
  - [`backend/server.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/server.js) (Stabilized CSP and SPA headers)
  - [`frontend/src/hooks/useRealtimeSync.js`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/hooks/useRealtimeSync.js) (Redesigned SSE reconnect timeouts)
* **Architecture Detail**:
  - **Infinite SSE Loop Fix**: In high-load setups, Server-Sent Events (SSE) connections were looping infinitely due to browser reconnect rules. Reconfigured the SSE handshake to utilize a clean invalidation trigger pattern, alerting the client to fetch state changes rather than pushing raw bulk lists.
  - **SPA Routing**: Embedded wildcard route intercepts on the Express server (`app.get('*')`) to cleanly redirect deep-linked URLs (e.g. `/profile/edit`) to Vite's root SPA router, preventing standard `404 Not Found` page errors.

#### 🏷️ Commit `94ccd58`: Cloudinary CDN & Cached Email Log CC System
* **Target Files Modified**:
  - [`backend/middleware/uploadMiddleware.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/middleware/uploadMiddleware.js) (Multer configuration with Cloudinary Storage Engine)
  - [`backend/controllers/emailLogController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/emailLogController.js) (Integrated outbox CC parameters)
  - [`backend/models/Settings.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Settings.js) (Introduced SMTP configurations)
* **Architecture Detail**:
  - **Dynamic CDN Uploads**: Integrated Cloudinary SDK into a Multer file upload pipeline. Document attachments (.pdf, .doc, images) are uploaded to Cloudinary, and the returned URLs are saved to the database.
  - **CC Routing Rules**: Added custom settings parameters inside System Settings so that all critical emails (like task assignments) are carbon-copied (CC'd) to branch heads or designated IT mailboxes automatically.

#### 🏷️ Commit `cf7d10a`: Non-blocking IMAP Worker & Jest E2E Verification Suites
* **Target Files Modified**:
  - [`backend/workers/emailWorker.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/workers/emailWorker.js) (Automated node-cron script)
  - [`backend/tests/auth.test.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/tests/auth.test.js) (Security E2E testing)
  - [`backend/tests/rbac.test.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/tests/rbac.test.js) (Tenant-isolation E2E testing)
* **Architecture Detail**:
  - **Background Worker**: Built a background cron worker utilizing `node-cron` that wakes up every 10 minutes to scan the SMTP email outbox and updates sync statuses without blocking main HTTP request threads.
  - **E2E Testing Harness**: Configured automated integration tests using Jest and Supertest to verify authentication limits, phone string formatting rules, inactive account logins, and tenant isolation borders.

---

### 🏢 3. Admin Panel Deep-Dive & Branch Department Topography

#### 🏷️ Commit `9893caa`: Cascade Renaming & Department Safety Guards
* **Target Files Modified**:
  - [`backend/controllers/branches/branchController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/branches/branchController.js)
  - [`backend/controllers/departments/departmentController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/departments/departmentController.js)
* **Architecture Detail**:
  - **Tree Cascade Renaming**: Renaming a branch dynamically cascades the string identifier change down to all child `Department` configurations, active `User` documents, and corresponding `Task` parameters, ensuring zero orphan references.
  - **Delete Safeguards**: Restructured department updates to block deletions if they have active users or tasks associated.

#### 🏷️ Commit `a24d9b6`: Dynamic Per-Branch Departments Configuration
* **Target Files Modified**:
  - [`backend/models/Branch.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Branch.js)
  - [`backend/seed.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/seed.js)
  - [`frontend/src/components/Tasks/Tasks.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/Tasks.jsx)
* **Architecture Detail**:
  - **Hierarchical topographies**: Overhauled schemas to map specific departments to distinct branches, breaking away from universal global arrays. Branch-heads can configure distinct departments for Branch A without affecting Branch B.

---

### 🎨 4. Premium UX Overhauls & Security Enhancements

#### 🏷️ Commit `2e1bc2a`: Frontend Logout Security Gap & Task Search Indexes
* **Target Files Modified**:
  - [`backend/models/Task.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Task.js) (Added MongoDB full-text index)
  - [`frontend/src/store/features/auth/authSlice.js`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/store/features/auth/authSlice.js)
* **Architecture Detail**:
  - **Logout Memory Flush**: Cleared Redux stores completely upon user logout to prevent session recovery attempts by back-button triggers or browser console sniffing.
  - **Text Index Optimization**: Configured a `text` search index on `title` and `description` inside Mongoose Task schemas to allow fast, weighted keyword searches.

#### 🏷️ Commit `bb54fb9`: Framer-motion Page Transitions & Institutions Branding
* **Target Files Modified**:
  - [`frontend/src/components/Dashboard/Dashboard.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Dashboard/Dashboard.jsx)
  - [`frontend/src/components/Employee/EmployeeProfile.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Employee/EmployeeProfile.jsx)
* **Architecture Detail**:
  - **UI Visual Accents**: Integrated Framer-Motion route transition cards. Overhauled design assets to represent the premium corporate style of the *Scholars' Group of Institutions*.

---

### ✉️ 5. Bug Auditing & System Hardening

#### 🏷️ Commit `e899aaa`: SMTP Server Crash Bypass
* **Target Files Modified**:
  - [`backend/controllers/tasks/taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)
* **Architecture Detail**:
  - **Zero-Crash Email Pipeline**: Wrapped Nodemailer transports inside a `try-catch` wrapper block. If the mail server times out or fails, task records are saved cleanly and an in-app error notification is routed to the task creator.

#### 🏷️ Commit `9085e60`: Settings Deletion Guards & pulsating Save Buttons
* **Target Files Modified**:
  - [`frontend/src/components/Admin/SystemSettings.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/SystemSettings.jsx)
  - [`backend/controllers/settings/settingsController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/settings/settingsController.js)
* **Architecture Detail**:
  - **Dirty State Tracking**: Implemented local state tracking array comparisons to identify unsaved updates, drawing visual attention via a pulsating gradient save button.

---

### 🔄 6. Branch Employee Transfers & Task Migration Cascades

#### 🏷️ Commit `057266f`: Active Cards & Direct Employee Transfer System
* **Target Files Modified**:
  - [`frontend/src/components/Admin/BranchManagement.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/BranchManagement.jsx)
  - [`backend/controllers/users/userController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)
* **Architecture Detail**:
  - **Migrating Assignments**: Upgraded user update models to cascade: when an employee is transferred to a new branch, their `branch` attribute matches automatically across **all single-assignee and team task assignments** in the database.
  - **Dynamic Card Feeds**: Branch management panels display live scrollable grids of branch personnel while suppressing manager/head redundancies.

---

### 🛡️ 7. Soft-Delete Pipelines & Split-Pane Dual Modals

#### 🏷️ Commit `90cfba9`: Global Soft-Delete Pipeline & Wide Split-Pane Viewports
* **Target Files Modified**:
  - [`backend/models/User.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/User.js) (Added soft-delete attributes)
  - [`backend/models/Task.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Task.js) (Added soft-delete attributes)
  - [`backend/routes/userRoutes.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/routes/userRoutes.js) (Route reordering)
  - [`frontend/src/components/Admin/UserManagement.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/UserManagement.jsx) (Split-pane view and Recycle Bin UI)
  - [`frontend/src/components/Tasks/CreateTaskModal.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/CreateTaskModal.jsx) (Split-pane view)
  - [`frontend/src/components/Tasks/EditTaskModal.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/EditTaskModal.jsx) (Split-pane view)
  - [`frontend/src/components/Common/SearchableCombobox.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Common/SearchableCombobox.jsx) (Reusable Combobox component)
* **Architecture Detail**:
  - **Soft-Delete Engine**: Enforced unified `{ isDeleted: { type: Boolean, default: false }, deletedAt: Date }` schemas across collections. Hard deletions are forbidden. Deleting a user automatically nullifies single-assignee fields and pulls the ID from team lists atomically, while soft-deleting their Employee record.
  - **Wide Split-Pane Forms**: Restructured input screens. Details are partitioned: basic attributes on the left column, relational arrays (Affiliations, active task trackers, checklists, collaborating entities) on the right column.
  - **Dependent Cascades**: Branch comboboxes filter child departments dynamically, resetting invalid child selectors to prevent orphan configurations.

---

### 🎨 8. Persistent Layout Shell & Typography Refinement

#### 🏷️ Commit `[Pending]`: Persistent Layout Routing Shell, Suspense Skeletons, and Typography Overhaul
* **Target Files Modified**:
  - [`frontend/src/App.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/App.jsx) (Restructured to nested layout child routes)
  - [`frontend/src/components/Layout/Layout.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Layout/Layout.jsx) (Outlet injection, Suspense wrapping, DashboardSkeleton)
  - [`frontend/index.html`](file:///c:/Users/abdul/Desktop/erp_final/frontend/index.html) (Imported Inter & Plus Jakarta Sans Google Fonts)
  - [`frontend/src/index.css`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/index.css) (Standardized typography and forced sub-pixel antialiasing)
* **Architecture Detail**:
  - **Persistent Shell (No Re-Mounting)**: Refactored route mapping to nest dynamic routes under a single shared layout route `<Route element={<Layout />}>`. Sidebar and Header stay mounted permanently, preventing unmounts and eliminating the white routing flash.
  - **Suspense Fallbacks**: Wrapped dynamic `<Outlet />` inside React `<Suspense fallback={<DashboardSkeleton />}>` displaying a beautiful glassmorphic shimmer layout during lazy component resolution instead of blank screens.
  - **Typography Overhaul**: Standardized text constraints using Inter for body text and Plus Jakarta Sans for headers, complete with `-webkit-font-smoothing` rendering to ensure a sleek corporate look.

