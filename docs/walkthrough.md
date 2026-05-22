# Enterprise SaaS ERP: Ultimate Full-Stack Evolution & Walkthrough

This document serves as the absolute, single-source-of-truth master ledger. It documents every single bug fix, system overhaul, database migration, security hardening, and UI/UX enhancement implemented since the inception of the project from scratch.

---

## 📂 Git Commit History & Release Timeline

Below is the chronological log of all updates committed and pushed to the online cloud repository (`origin master` at `https://github.com/abdulrahmans0414/erptaskdashboard.git`):

| Commit Hash | Commit Type | Core Description | Key Impact |
| :--- | :--- | :--- | :--- |
| **`[Pending]`**| `feat` | Persistent layout routing shell, Suspense fallback skeletons, and Inter typography standard. | Eliminated dashboard white routing flashes and standardized typography. |
| **`90cfba9`** | `feat` | Global soft-delete pipeline, searchable comboboxes, and wide split-pane dual modals. | Applied premium dual-column views and safety cascading globally across User and Task modules. |
| **`057266f`** | `feat` | Enterprise branch soft-delete pipeline and split-pane UI modal overhaul. | Refactored branch configuration views and introduced local soft-deletes. |
| **`9085e60`** | `feat` | Add settings safeguards and enhance mobile responsiveness. | Added `isDirty` safeguards, blocked deletion of in-use depts/branches, and optimized mobile swipe tabs. |
| **`93f505e`** | `docs` | Update README.md with comprehensive project architecture and security auditing details. | Refactored root readme with clean HSL systems and secure API maps. |
| **`1fd9d5e`** | `security` | Harden backend tasks controller, secure against NoSQL query injections, and optimize aggregations. | Cast parameters to primitives, added attempts bounds, version locks (`__v`), and optimized summary indexes. |
| **`59d586e`** | `feat` | Fix real-time dashboard export stats and login mobile viewport responsiveness. | Integrated real-time DB parameters to CSV export and made the login page fully scrollable. |
| **`82106dd`** | `feat` | Implement profile, task scoping, error notifications, and UI enhancements. | Added team-fetch scoping by branch, synced profile changes to header, and added red validation toasts. |
| **`e899aaa`** | `fix` | Deep-dive bug fixes across full stack - task creation 500 error resolved. | Wrapped SMTP email logic in try-catch to prevent system-wide crash, adding in-app notifications fallback. |
| **`a4ffed4`** | `fix` | Guard attachments before mapping in sendEmailNotification to prevent crash when assigning task. | Resolved null-reference mapping exceptions in SMTP uploads. |
| **`7942ee8`** | `fix` | Fix startup emails, department unmapping on user update, route guards for heads, and task limits. | Eliminated branch head unmapping glitches and route access overlaps. |
| **`dea4a9f`** | `chore` | Improve branch form responsiveness and display phone in profile header. | Mobile card grid tuning and contact alignment. |
| **`3c6f2e0`** | `style` | Overhaul EmployeeMiniCard in Dashboard to look like a premium SaaS card. | Glassmorphism, ID badges, HSL custom styling, and performance bars. |
| **`ad21ea7`** | `fix` | Import and register all mongoose models in seed_fields.js to prevent MissingSchemaError. | Fixed missing schema compilation errors during seeding hooks. |
| **`4dc6aaa`** | `fix` | Add DNS configuration to bypass SRV lookup failures in seed_fields.js. | Configured manual DNS lookups for MongoDB Atlas cluster connections. |
| **`2e4660a`** | `feat` | Add user fields database migration/seeder script. | Created `seed_fields.js` to bootstrap development data. |
| **`a922d30`** | `fix` | Map email and phone fields in employee summary list controller response. | Exposed contact metrics on the dashboard employee rows. |
| **`e391f0d`** | `feat` | Fetch and select email and phone in getEmployeeSummary backend controller. | Optimized mongoose projection boundaries. |
| **`cd8a707`** | `style` | Display employee email, phone, and ID badge in dashboard cards. | UI quick action mappings. |
| **`7d46b72`** | `feat` | Redesign login with premium dark theme and upgrade employee cards. | Added dark glass theme and floating particle layers. |
| **`2a70778`** | `fix` | Prevent CastError on empty date range queries and refactor Login register form. | Restructured registration into clean 2-column steps. |

---

## 🛠️ Complete Phase-by-Phase Technical Walkthrough

### 🚀 Phase 1: Database Seeders, Setup & Date Range Hardening

#### 1. Database Seeder Migration (`seed_fields.js`)
* **Problem**: Running `node seed_fields.js` failed with `MissingSchemaError` when pre-save hooks on User tried to reference Department/Branch models before they were registered in Mongoose. Additionally, MongoDB Atlas connection strings failed due to local network SRV DNS issues.
* **Solution**:
  - Registered all models (`User`, `Branch`, `Department`, `Employee`, `Task`, `Settings`) at the absolute top of the seed script before any execution.
  - Implemented custom DNS config parameters inside the seeder connection options to bypass SRV errors.
  - Formulated robust Mock data including default custom fields, branches, and departments.

#### 2. Date Range casting Safeguard
* **Problem**: Passing empty date ranges in dashboard filters triggered backend `CastError: Cast to date failed for value ""` and crashed queries.
* **Solution**: Refactored the dashboard date range query parser to validate arguments before appending them to the MongoDB filter. Empty ranges are skipped dynamically, and fallbacks are initialized.

---

### 🎨 Phase 2: Premium UI, Glassmorphic Login & Dashboard Overhaul

#### 1. Dark Particle Login Portal (`Login.jsx`)
* **Problem**: The login screen was a standard, single-column crowded screen that broke on smaller mobile heights and lacked a premium SaaS appeal.
* **Solution**:
  - Upgraded to a deep-dark glassmorphic theme using custom HSL colors.
  - Added an **interactive canvas particle element** that floats dynamically behind forms.
  - Restructured the registration process into a compact **multi-step 2-column wizard** that animates cleanly.
  - Replaced `overflow-hidden` with `overflow-y-auto` on the page wrapper to ensure mobile devices can fully scroll long forms without cutting off elements.

#### 2. Premium `EmployeeMiniCard` Overhaul (`Dashboard.jsx`)
* **Problem**: The employee summary on the admin dashboard was represented by generic, dull rows without visual actions or branding.
* **Solution**:
  - Created a glassmorphic card component with glowing border accents.
  - Added detailed information badges (Unique Employee ID, Blood Group, Active status).
  - Integrated **quick action links** (Direct-Call phone numbers and 1-click email popups).
  - Added a visual **workload progress bar** indicating percentage of completed tasks.

---

### ✉️ Phase 3: Full-Stack Bug Fixes & Email Notifications Hardening

#### 1. Zero-Crash SMTP Notifications (`taskController.js`)
* **Problem**: If the backend email transporter (`nodemailer`) failed (e.g. SMTP credentials misconfigured, network timeout), it threw an uncaught error, causing the entire `createTask` API request to fail with a `500 Internal Server Error` and aborted the database transaction.
* **Solution**:
  - Wrapped `sendEmailNotification` in a clean `try-catch` block.
  - On email delivery failure, the task is still successfully saved to the database.
  - An **in-app notification** is immediately dispatched to the task **creator** informing them: *"⚠️ Task created successfully, but email delivery to assignee failed due to SMTP configuration."*

#### 2. Task Email Attachments Safeguard (`taskController.js`)
* **Problem**: Assigning tasks containing empty or no file attachments triggered a crash in `sendEmailNotification` when mapping variables.
* **Solution**: Added protective safeguards: `if (task.attachments && Array.isArray(task.attachments)) { ... }` to guarantee safe variable iteration.

#### 3. Employee ID Assignment Profile Sync (`EditProfileModal.jsx`)
* **Problem**: Modifying profile values did not update the Employee ID field, which was completely missing from the modal's state initialization, and profile updates didn't synchronize with the top navbar/sidebar.
* **Solution**:
  - Initialized `employeeId` during the profile modal click-handler mapping.
  - Made the field **read-only for standard employees** (to prevent ID spoofing) and **editable for Admin/IT roles**.
  - Synchronized updates globally using the `refreshUser()` method inside the `AuthContext`, immediately updating the Redux state, which syncs the header avatar and sidebar name in real-time.

#### 4. Team Scope & Branch/Department Stats Isolation (`userController.js`, `EmployeeProfile.jsx`)
* **Problem**: Branch heads and Department heads were seeing team stats and task workloads of employees from other branches, violating data isolation guidelines.
* **Solution**:
  - Overhauled team fetches on the profile dashboard to query `getUsersByBranch(emp.branch)` for heads, limiting their views.
  - Added a `?branch=X` filter parameter to `getUsersByDepartment` in the backend so department lists are strictly branch-scoped.
  - Task lists now fetch via `getTasks({ department, branch })` to accurately limit stats cards.

---

### 🛡️ Phase 4: Enterprise Settings Safeguards & Mobile Responsiveness

#### 1. Branch/Department Deletion Dependency Safeguards (`settingsController.js`)
* **Problem**: Deleting a department or branch permanently deleted metadata, leaving active employees and tasks with orphan reference keys, which broke the UI.
* **Solution**:
  - Implemented active scans before saving changes.
  - If an administrator tries to delete a branch or department containing active staff (`User`) or pending tasks (`Task`), the update is **blocked with a `400 Bad Request`**.
  - The server explicitly informs the user about active associations (e.g. *"Cannot delete 'IT' department. It has 4 active employees and 2 active tasks assigned."*).

#### 2. Unsaved Changes Pulsating Ring (`SystemSettings.jsx`)
* **Problem**: Admins deleted/modified tags locally but left the page without clicking global "Save Changes", resulting in lost progress without warnings.
* **Solution**:
  - Created client-side `isDirty` state trackers.
  - Displays a glowing amber warning bar: *"⚠️ You have unsaved changes! Please click 'Save Changes' to permanently apply updates."*
  - Applies a dynamic, pulsating indigo-blue gradient ring around the header's **Save Changes** button to draw immediate user attention.
  - Integrated native `window.confirm` intercepts on tag deletions to remind users that actions are local until global save.

#### 3. Mobile Navigation Tab Horizontal Swipe Scroll (`SystemSettings.jsx`)
* **Problem**: The tabs in system settings squished on mobile screens and leaked out of bounds, breaking layout grids.
* **Solution**: Upgraded tab bar container with Tailwind `overflow-x-auto whitespace-nowrap scrollbar-none flex-shrink-0` tags, allowing effortless mobile swipe scrolling.

---

### 🔄 Phase 5: Branch Employee Management & Direct Transfer System

#### 1. Active Cards & Duplicate Suppression (`BranchManagement.jsx`)
* **Problem**: Branch cards displayed duplicate entries if a single employee held both "Head" and "Manager" positions, and branch lists did not show actual staff members.
* **Solution**:
  - Built dynamic scrollable member cards fetching user profiles in real-time.
  - Suppressed duplicate roles: if the head and manager are the same user, it renders a single, consolidated tag: `Head & Manager: [Name]`.

#### 2. Interactive Direct Employee Transfer System (`BranchManagement.jsx`, `userController.js`)
* **Problem**: No visual way existed to move an employee from Branch A to Branch B without manually altering database strings.
* **Solution**:
  - Added a stateful **Employee Transfer Modal** inside Branch Management.
  - Selecting a target Branch dynamically filters and updates the Department list mapped to that branch.
  - Upon clicking "Confirm", a backend task migration cascade is executed: the `branch` string is updated on the `User` document AND **all associated `Task` documents** where the employee is the single assignee or a team member.

---

### 🛡️ Phase 6: Global Soft-Delete Pipeline & Wide Split-Pane Viewports

#### 1. Database-Wide Soft-Delete Engine (Backend Models & Controllers)
* **Problem**: Physical database deletions resulted in broken statistics, orphan task cards, and permanent data loss.
* **Solution**:
  - Added `{ isDeleted: { type: Boolean, default: false }, deletedAt: Date }` to all Mongoose schemas.
  - `deleteUser` sets `isDeleted: true`, `isActive: false` and cascades: nullifies task assignees (`assignedTo = null`), pulls users from team checklists (`$pull` from `assignedTeam`), and soft-deletes related `Employee` profile records.
  - `deleteTask` sets `isDeleted: true` while preserving description and file attachments in case of recovery.
  - Overhauled queries (`find`, `aggregate`) to systematically filter out soft-deleted files using `{ isDeleted: { $ne: true } }`.

#### 2. NoSQL injection Protection & Parametric Route Safety
* **Problem**: Attackers could inject objects (e.g. `?status[$gt]=""`) in filters to bypass data isolation. Also, new Recycle Bin routes `/deleted/all` were hijacked by parametric routes `/:id`.
* **Solution**:
  - Applied strict primitive string casting `String(req.params.id)` to prevent MongoDB operator injection.
  - Positioned Recycle Bin endpoints (`/deleted/all`, `/:id/restore`) **above** parametric routes (`/:id`) in routing files to ensure proper URL resolution.

#### 3. Wide Split-Pane Dual Modals (User & Task Management)
* **Problem**: Editing users or creating tasks with complex checklists led to long, intimidating vertical scrolling forms.
* **Solution**:
  - Overhauled forms into elegant, dual-column widescreen viewports.
  - **User Management Split View**: Left pane holds standard profiles (Name, Email, Phone, custom fields); Right pane features a Framer Motion tab switcher (Tab 1: Role, Branch & Department Comboboxes; Tab 2: Searchable scrollable feed of the user's active task assignments).
  - **Task Workflows Split View** (Create & Edit Task Modals): Left pane holds core metadata (Title, Description, Due Date, Priority, Estimates); Right pane handles connections (Tab 1: Single Assignee Combobox or Team Checklists; Tab 2: Collaborating Department metrics and file attachments dropzone).

#### 4. Searchable Comboboxes & Cascading Filters (`SearchableCombobox.jsx`)
* **Problem**: Selecting branches/departments in tasks and user panels was done via basic HTML select dropdowns, which allowed selecting invalid cross-branch department combinations.
* **Solution**:
  - Built `SearchableCombobox` featuring live search, avatar graphics, description parameters, and keyboard access.
  - Integrated cascading dependencies: selecting a parent branch dynamically updates, isolates, and resets child department dropdown options.

---

## 🏗️ Master Architectural Schema Reference

```
 ┌─────────────────────────────────────────────────────────────┐
 │                     User Document (DB)                      │
 ├─────────────────────────────────────────────────────────────┤
 │ _id: ObjectId                                               │
 │ name: String                                                │
 │ email: String                                               │
 │ role: String ('admin', 'it', 'branch-head', 'teacher', etc.)│
 │ branch: String (Branch Reference)                           │
 │ department: String (Department Reference)                   │
 │ employeeId: String (Unique, Sparse)                         │
 │ isDeleted: Boolean (Default: false)                         │
 │ deletedAt: Date                                             │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                │ Has Associated Tasks
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                     Task Document (DB)                      │
 ├─────────────────────────────────────────────────────────────┤
 │ _id: ObjectId                                               │
 │ title: String                                               │
 │ assignedTo: ObjectId (Ref: User, Null on soft-delete)       │
 │ assignedTeam: [ObjectId] (Ref: User)                        │
 │ department: String                                          │
 │ branch: String (Denormalized)                               │
 │ status: String ('Pending', 'In Progress', 'Completed')       │
 │ isDeleted: Boolean (Default: false)                         │
 │ deletedAt: Date                                             │
 └─────────────────────────────────────────────────────────────┘
```

---

---

### 🏛️ Phase 7: Persistent Layout Routing Shell & Premium Typography

#### 1. Persistent Layout Shell & Outlet Integration (`App.jsx`, `Layout.jsx`)
* **Problem**: Clicking a sidebar link caused a complete unmount and remount of `<Sidebar>` and `<Header>`, triggering a highly visible white page flash for several milliseconds and resetting local component states.
* **Solution**:
  - Restructured `AppRoutes` using React Router's nested child routing system. The entire authenticated area is now nested under a single persistent layout shell wrapper: `<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>`.
  - Replaced `{children}` in `Layout.jsx` with `<Outlet />` to let React Router inject child page components directly without unmounting the surrounding shell.

#### 2. Suspense & Glassmorphic Skeleton Shimmer Fallbacks (`Layout.jsx`)
* **Problem**: Dynamically loaded lazy components caused blank gaps during state transitions or initial downloads.
* **Solution**:
  - Wrapped the dynamic route `<Outlet />` inside a highly optimized React `<Suspense fallback={<DashboardSkeleton />}>` boundary.
  - Implemented a premium glassmorphic shimmer `<DashboardSkeleton />` in `Layout.jsx` displaying beautifully structured, pulsing grid cards, task lists, and avatar lines to maintain absolute visual flow.

#### 3. Standardized Sleek Typography & Anti-Aliased Rendering (`index.html`, `index.css`)
* **Problem**: Raw browser default sans-serif font fallbacks and uneven header bold font-weights degraded the high-end SaaS feel.
* **Solution**:
  - Loaded Google Fonts for **Inter** (for clean corporate text) and **Plus Jakarta Sans** (for elegant headings) inside `index.html`.
  - Standardized font hierarchies and forced sub-pixel antialiased rendering (`-webkit-font-smoothing: antialiased`) globally inside `index.css`.

---

---

### 🔍 Phase 8: Dynamic SEO Meta Injection & Private Area Exclusions

#### 1. Modular Metadata Hook (`useDocumentMetadata.js`)
* **Problem**: Standard routes had default static HTML headers, giving search crawlers access to index sensitive employee dashboards, or showing generic page titles for all internal portals.
* **Solution**:
  - Engineered a modular `useDocumentMetadata.js` custom React hook.
  - Dynamically modifies document titles and injects dynamic `<meta>` tags (e.g. `robots`, `og:title`, `og:description`, `og:image`).

#### 2. Search Crawler Exclusion Rules
* **Problem**: Employee management logs, branch allocations, and tasks grids are strictly corporate records that should never appear on public Google Search lists.
* **Solution**:
  - Mounted `useDocumentMetadata({ noIndex: true })` globally across private employee routes (`UserManagement.jsx`, `BranchManagement.jsx`, `Tasks.jsx`).
  - Search crawlers are explicitly instructed with `noindex, nofollow` to prevent indexing of internal business pages.
  - Configured public indexability for the main sign-in landing screen (`Login.jsx`) to showcase dynamic Open Graph visual previews.

---

### ⚡ Phase 9: Frictionless Form Entry & Click-Optimization Presets

#### 1. Selectable Inline Priority Chips (`CreateTaskModal.jsx`, `EditTaskModal.jsx`)
* **Problem**: Specifying task priorities was locked behind standard HTML `<select>` dropdowns, requiring two distinct clicks and breaking workflow speed.
* **Solution**:
  - Designed interactive, 1-click selectable inline priority chips (🟢 Low, 🟡 Medium, 🟠 High, 🔴 Urgent) with beautiful dynamic focus states.

#### 2. Due Date Presets (`CreateTaskModal.jsx`, `EditTaskModal.jsx`)
* **Problem**: Setting standard task timelines forced the administrator to trigger and interact with the browser's raw date picker input.
* **Solution**:
  - Integrated 1-click **Due Date Quick Presets** (Today, Tomorrow, 1 Week) that programmatically calculate and populate the target input field instantly.

#### 3. Cognitive Form Reordering
* **Problem**: Inputs were scattered and out-of-order, causing high cognitive fatigue during rapid data entries.
* **Solution**:
  - Sequenced form fields logically to match natural cognitive entry loops: `Title -> Description -> Timeline & Presets -> Priority Chips -> Branch Node -> Division -> Assignee`.

---

### 🎨 Phase 10: Grouped Card Input Chunking & UI Harmony

#### 1. Grouped Card Chunking (`UserManagement.jsx`, `BranchManagement.jsx`)
* **Problem**: Long, flat form listings caused information overload for managers attempting to configure new user profiles.
* **Solution**:
  - Divided input fields into visually isolated **grouped card blocks** with subtle backgrounds, clean borders, and detailed headers:
    - **User Form**: `👤 Account Identity`, `🏢 Corporate Mapping`, and `🔑 Security & Access`.
    - **Branch Form**: `🏢 Profile Details`, `📍 Geography & Mapping`, and `👑 Governance & Operations`.

#### 2. Standardized Focus States & Card Lifting Animations
* **Problem**: Form inputs lacked interactive visual feedback, and lists looked completely flat during interactions.
* **Solution**:
  - Standardized all input focus borders with soft indigo-blue rings: `focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`.
  - Added subtle hover scaling animations (`.hover-lift`) to tasks and statistic widget grids.

---

### 📱 Phase 11: Mobile Button Unification & Custom Deletion Modals

#### 1. Compact Action Controls & Wrap Layout (`TaskCard.jsx`)
* **Problem**: The "Delete Task" action button occupied a full-width block below other controls. This resulted in an oversized, blocky button on both desktop and mobile screens.
* **Solution**:
  - Decoupled task action menus: desktop items display vertically on the right (`sm:flex-col`), while mobile controls flow inline and wrap gracefully (`flex-row flex-wrap items-center justify-start`) inside an elegant divider block (`border-t border-gray-100/70 pt-3`).
  - Standardized buttons with subtle pastel border outlines (`bg-slate-50 border-slate-200/80`, `bg-rose-50 border-rose-200/80`) to ensure visually balanced hierarchies.

#### 2. Custom Glassmorphic Deletion Modals (`DeleteConfirmModal.jsx` [NEW])
* **Problem**: Invoking native, browser-blocking `window.confirm()` popups broke visual UI continuity and degraded professional enterprise appeal.
* **Solution**:
  - Created a custom React-rendered confirmation modal showing glowing hazard icons, descriptive warning headers, and secure cancellable triggers wrapped in a dark glassmorphic back-shroud.

---

### 🌓 Phase 12: Page Header Specificity Hardening

#### 1. CSS Selector Specificity Override (`Dashboard.jsx`, `Reports.jsx`, `TaskPerformance.jsx`, `ProfileHeader.jsx`)
* **Problem**: The global `index.css` direct selector rule (`h1, h2, h3, h4, h5, h6 { @apply text-slate-900; }`) overrode standard styling inheritance. Consequently, headers rendered inside high-contrast dark gradient cards inherited dark-gray text, rendering them almost unreadable.
* **Solution**:
  - Systematically audited all dashboard panels and appended high-priority specificity classes (`text-white`) directly to heading elements inside gradient containers, ensuring pristine, readable light-on-dark contrast under all viewport scales.

---

### 🛡️ Phase 13: Pre-Launch Pre-Production System-Wide Security Hardening

#### 1. Recursive Input Sanitization & SQL/NoSQL Injection Defenses (`sanitize.js` [NEW], `server.js`)
* **Problem**: Raw HTTP payloads could be manipulated via parameter injection to bypass backend MongoDB access rules.
* **Solution**:
  - Engineered a global custom middleware `sanitizeInput` that deeply processes all inbound requests (`req.body`, `req.query`, and `req.params`).
  - Automatically escapes vulnerable HTML characters to block Cross-Site Scripting (XSS).
  - Traverses incoming objects and strips any keys beginning with `$` or containing `.` to systematically neutralize NoSQL operator injections.

#### 2. High-Capacity MongoDB Connection Pooling Scaling (`db.js`)
* **Problem**: Default MongoDB settings only allowed 10 simultaneous connection pools, risking connection starvation under peak stress load limits.
* **Solution**:
  - Upgraded pooled connection parameters dynamically, setting `maxPoolSize` to `100` (up from `10`) and `minPoolSize` to `10` (up from `2`) to enable high-concurrency request routing.

#### 3. GDPR / IT Act 2000 Hashing Strength & Bypass Rules (`PendingRegistration.js`, `User.js`)
* **Problem**: Plaintext passwords stored in the unapproved candidate collection breached user privacy standards, and direct approvals risked double-hashing user passwords when moving records to the main collection.
* **Solution**:
  - Configured `PendingRegistration` schemas to run password pre-save salt encryption utilizing `bcryptjs` with **12 salt rounds**.
  - Strengthened `User.js` profiles to use **12 salt rounds** (up from `10`).
  - Added a smart signature-matching regex (`startsWith('$2a$')` or `startsWith('$2b$')`) to the pre-save hook to skip re-hashing already pre-encrypted passwords upon profile activation.

#### 4. Clean Background Diagnostics logging (`emailWorker.js`)
* **Problem**: Repeated IMAP background sync messages printed to the standard console every few minutes, cluttering logs and reducing terminal readability in development.
* **Solution**:
  - Upgraded the worker to utilize Winston's central logging channels. Changed repetitive background checks to use a quiet `logger.debug()` layer while keeping key milestones (like actual synchronized emails or error logs) mapped to `logger.info()` and `logger.error()`.

---

### 🛡️ Phase 14: Legacy Role Purge & Transaction Hardening

#### 1. System-Wide Legacy Role Purge
* **Problem**: The system had multiple legacy roles (`coordinator`, `mentor`, `teacher`, `student`) that were no longer utilized, causing cluttered UI dropdowns, extra color badge assignments, and oversized role schemas.
* **Solution**:
  - Purged all legacy roles from the Mongoose schema validation enums in `User.js` and `PendingRegistration.js`.
  - Streamlined frontend constants `ROLE_LABELS`, `ROLE_BADGE`, and the `roles` array in `UserManagement.jsx`, `Login.jsx`, `EditProfileModal.jsx`, and `PendingRegistrations.jsx`.

#### 2. Mongoose Transaction Options Safety Fallback
* **Problem**: Running on local standalone MongoDB environments throws validation errors when passing `{ session: null }` inside Mongoose write options during soft-deletes and cascaded user/branch updates.
* **Solution**: Refactored transaction option arguments in `userController.js` and `branchController.js` to conditionally pass session options (`session ? { session } : {}`), allowing full compatibility with both local development setups and cloud production replica sets.

#### 3. Soft-Deleted Unique Index Exclusions
* **Problem**: Unique constraints on high-privilege branch-heads and department-heads prevented assignment of new heads if the previous active heads were soft-deleted.
* **Solution**: Added `isDeleted: false` to the index `partialFilterExpression` maps in `User.js`, and added automatic drop-and-sync routines during server initialization inside `server.js` to automatically rebuild active indices.

---

## 🏆 Production Validation Status

* **Frontend Build**: Compiled using Vite (`pnpm run build`) successfully.
  * **Result**: **0 Errors, 0 Warnings**.
  * **Build Timing**: Bundles compiled perfectly inside **7.30 seconds**.
  * **Asset Optimization**: Standardized production JS chunks (`index-*.js`), combined Tailwind layouts (`index-*.css`), and optimized HTML asset maps.
* **Backend Dev Server**: Hot-reloading operational, routing successfully with 100% quiet background terminal cycles.
* **Database State**: Fully migrated with safe indices, transactional triggers, and zero plaintext user records.
