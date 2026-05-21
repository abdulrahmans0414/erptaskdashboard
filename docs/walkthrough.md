# Bug Fix Walkthrough

Complete summary of all fixes applied across the ERP dashboard.

---

## What Was Fixed

### 🔧 Bug 1 — Profile Edit Modal: Missing Employee ID

**Files changed:**
- [`EditProfileModal.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Employee/Profile/EditProfileModal.jsx)
- [`EmployeeProfile.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Employee/EmployeeProfile.jsx)

**What was done:**
- Added `employeeId` field to the `handleEditClick` form initialization (it was previously missing)
- Added `employeeId` input in `EditProfileModal` — shows as **read-only** for employees, **editable for admins**
- Also added all roles from User model (coordinator, mentor, teacher, student) to the role dropdown

---

### 🔧 Bug 2 — Task Email Notifications Not Arriving

**Files changed:**
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)

**What was done:**
- Wrapped email send in `try-catch` — previously any email error would propagate and potentially break task creation
- If email fails (SMTP misconfiguration, network error, etc.), an **in-app notification** is now sent to the task **creator** explaining the failure
- This means: task creation succeeds even if email fails, and the creator sees a notification about it

> [!NOTE]
> If emails are still not arriving, check that `EMAIL_USER` and `EMAIL_PASS` are correctly set in `backend/.env`. The email service uses Gmail SMTP by default.

---

### 🔧 Bug 3 — Team Tab Empty + Department Stats Wrong

**Files changed:**
- [`EmployeeProfile.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Employee/EmployeeProfile.jsx)
- [`userController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)
- [`userRoutes.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/routes/userRoutes.js)
- [`userApi.js`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/services/api/userApi.js)

**What was done:**
- **Team members:** Added admin/IT to the team fetch logic — they now call `getUsersByBranch(emp.branch)` to get the full team of whoever's profile they're viewing
- **Dept stats:** For admin, IT, and branch-head: now fetches dept-wide tasks separately using `getTasks({ department, branch })`, instead of filtering from the individual employee's tasks only
- **Backend route:** Added `department-head` role to `/branch/:branch` authorization (needed for team fetch)
- **Backend route:** Added `hr` role to `/department/:department` authorization
- **Backend controller:** `getUsersByDepartment` now accepts optional `?branch=X` query param for proper branch scoping

---

### 🔧 Bug 4 — History Tab Showing Nothing

**Root cause:** Same as Bug 3 — tasks weren't being fetched correctly for team tasks and cross-role views.

**Fix:** The history tab derives its data from `tasks` state. By fixing the task fetch scope (Bug 3), the history tab now correctly shows all completed/approved tasks.

---

### 🔧 Bug 5 — Profile Edit Doesn't Update Header/Sidebar

**Files changed:**
- [`EmployeeProfile.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Employee/EmployeeProfile.jsx)

**What was done:**
- After a successful profile update, if the user is editing **their own profile**, `refreshUser()` is called
- `refreshUser()` was already in `AuthContext` — it calls `getCurrentUser()` Redux thunk which re-fetches and updates `currentUser` in the store
- This means name/email changes in your own profile will immediately reflect in the sidebar and header

---

### 🔧 Bug 6 — Task Assignment Role Scoping

**Files changed:**
- [`CreateTaskModal.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/CreateTaskModal.jsx)
- [`userApi.js`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/services/api/userApi.js)
- [`userController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)

**What was done:**
- `getUsersByDepartment` now accepts an optional `branch` param both in the frontend API call and backend controller
- `CreateTaskModal` now passes the current user's `branch` when calling `getUsersByDepartment` — so a department-head from Branch A won't see employees from Branch B with the same department name
- Same fix applied in `EmployeeProfile.jsx` for team fetch

---

### 🔧 Bug 7 — Employee ID Backend Update

**Files changed:**
- [`userController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)

**What was done:**
- Added `employeeId` to the `updateUser` controller's destructuring
- Only `admin` and `it` roles can update `employeeId` (prevents spoofing)
- Branch heads and department heads cannot change `employeeId`

---

## Data Relationships Summary

```
User Model (MongoDB)
├── _id, name, email, role, department, branch
├── employeeId (unique, sparse — admin-only editable)
├── phone, address, bloodGroup, dateOfJoining
├── avatar, avatarPublicId (Cloudinary)
├── customFields (Map<String>)
└── isActive

Task Model (MongoDB)
├── assignedTo → User._id (single assignee)
├── assignedTeam → [User._id] (team task)
├── assignedBy → User._id (creator)
├── departmentManager → User._id (dept-head reviewer)
├── branchHead → User._id (branch-head reviewer)
├── department, branch (string — denormalized for query perf)
└── status, workflow.departmentReview, workflow.branchReview

Email Flow:
createTask() → sendEmailNotification() → SMTP (Gmail/Custom)
  ↓ on failure → createNotification(creator, "Email Delivery Failed")
  ↓ success → EmailLog saved to DB
```

---

### 🔧 Bug 8 — Dashboard Real-time Stats Export

**Files changed:**
- [`Dashboard.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Dashboard/Dashboard.jsx)

**What was done:**
- Replaced the placeholder dummy `getEmpStats` function call (which always returned hardcoded zeros) in the `exportCSV` function.
- Now, it maps directly to `emp.totalTasks`, `emp.completed`, `emp.inProgress`, and `emp.pending` which are correctly returned in real-time by the backend's `getEmployeeSummary` route inside the employee summary.

---

### 🔧 Bug 9 — Mobile Login Viewport Height Responsiveness

**Files changed:**
- [`Login.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Auth/Login.jsx)

**What was done:**
- Replaced `overflow-hidden` on the main page wrapper container with `overflow-y-auto` and converted `flex items-center justify-center` to `flex flex-col justify-center items-center py-8 px-4`.
- This ensures that on small viewport heights (like smartphones in portrait or landscape orientations), the registration steps and long forms can be fully scrolled instead of being cut off and covering the entire screen.

---

## Backend Security & Stability Hardening

### 🛡️ NoSQL Injection Defense (Query Casting)

**Files changed:**
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)

**What was done:**
- Enforced strict query parameter parsing/casting in `getTasks` (e.g. converting filter queries to clean strings using helper casts).
- This completely nullifies NoSQL injection attacks where attackers pass objects (like `?status[$ne]=completed`) to bypass role-based access scoping.

---

### 🛡️ Node.js Zero-Crash Safe Bounds (Attempts Array)

**Files changed:**
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)

**What was done:**
- Implemented robust bounds-checking in `reviewTask` and `submitTaskWithTime` to ensure the `attempts` array is not empty before indexing (`attempts[length - 1]`).
- If an attempt is missing (due to manual DB tweaks or import inconsistencies), it is automatically initialized and recovered rather than throwing an uncaught null-pointer exception that would crash the entire Node.js server.

---

### 🛡️ Optimistic Concurrency Control (OCC Lock)

**Files changed:**
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)

**What was done:**
- Implemented atomic state checking via Mongoose's version key (`__v`) in `reviewTask`.
- If multiple managers attempt to review or approve the same task simultaneously, the database update checks the retrieved version. The first reviewer succeeds, and the second reviewer receives a clear `409 Conflict` response, preventing write collision issues.

---

### 🛡️ Query & Index Optimization (`getEmployeeSummary`)

**Files changed:**
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)
- [`Task.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Task.js)

**What was done:**
- Optimized `getEmployeeSummary` task statistics aggregation by incorporating branch/department filters directly in the initial `$match` pipeline stage, pruning scanned documents at index lookup before `$unwind` processing.
- Added clean, dedicated single-field MongoDB indexes for `assignedTo` and `assignedTeam` in the Mongoose schema to speed up `$or` routing query paths.

---

## Settings Safeguards & Premium Responsive Aesthetics

### 🔒 Enterprise settings Deletion Guards
**Files changed:**
- [`settingsController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/settings/settingsController.js)

**What was done:**
- Added robust active dependency scans during department/branch updates.
- If an administrator tries to delete a department or branch that still has active employees (`User`) or tasks (`Task`) associated, the update request is safely blocked.
- The server responds with a `409 Conflict` or `400 Bad Request` that explicitly specifies how many active items are blocking the deletion (e.g. `'IT' (4 employees, 2 tasks)`), preventing accidental system breaking or orphan database records.

---

### ⚠️ Unsaved State Tracking & Dynamic UI Warnings
**Files changed:**
- [`SystemSettings.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/SystemSettings.jsx)

**What was done:**
- Implemented client-side `isDirty` state comparing local state arrays with current database-loaded values.
- If there are unsaved deletions or additions, a beautiful glowing amber notification bar animates on screen: *"⚠️ You have unsaved changes! Please click 'Save Changes' to permanently apply updates."*
- To guide user attention, the header's **Save Changes** button starts pulsating and glowing with a beautiful indigo-blue gradient ring.
- Refactored frontend API catch blocks to retrieve and display specific backend validation error responses in user-friendly red toast notices instead of throwing generic errors.

---

### 🛑 Deletion Intercept Confirmation Modals
**Files changed:**
- [`SystemSettings.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/SystemSettings.jsx)

**What was done:**
- Integrated confirmation interceptors (`window.confirm`) to tag and field deletions.
- If an admin clicks the `✕` button to remove a branch, department, or custom field, they are alerted that the deletion is only temporary/local until the global **Save Changes** button is clicked.

---

### 📱 Premium Mobile Swipe Scroll Tabs & Dashboard Filters
**Files changed:**
- [`SystemSettings.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/SystemSettings.jsx)
- [`Dashboard.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Dashboard/Dashboard.jsx)

**What was done:**
- **Swipe tabs:** Upgraded settings tab buttons container in `SystemSettings.jsx` to scroll horizontally (`overflow-x-auto whitespace-nowrap scrollbar-none`) on narrow screens while keeping flex elements intact (`flex-shrink-0`), guaranteeing effortless swipe navigation.
- **Filter rows:** Upgraded the search and filter grouping grid layout in `Dashboard.jsx` to neatly wrap into standard multi-columns or full width columns on mobile viewport break points instead of squishing and leaking off-screen.

---

## Phase 3: Branch Employee Management, Safeguards & Transfer System

### 🔧 Direct Employee Transfer System (Frontend & Backend Cascade)

**Files changed:**
- [`BranchManagement.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/BranchManagement.jsx)
- [`userController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)

**What was done:**
- **Task Migration Cascade (Backend):** When updating a user's branch inside `updateUser`, the system now automatically updates the `branch` string attribute on all associated `Task` documents where that employee is the single assignee (`assignedTo`) or a team member (`assignedTeam`).
- **Interactive Transfer Form (Frontend):** Implemented a stateful, highly interactive transfer popup modal for administrators. Admins can select any employee and choose their new target branch and department.
- **Dynamic Scoping:** Selecting a target branch dynamically filters and displays only the departments mapped to that specific branch, preventing invalid user state mapping.
- **Immediate UX Synchronicity:** On a successful transfer, the UI triggers a real-time hot refresh of both branch stats and active user arrays.

---

### 🔧 Branch Safeguards & Duplicate Suppression

**Files changed:**
- [`BranchManagement.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/BranchManagement.jsx)
- [`branchController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/branches/branchController.js)

**What was done:**
- **Dynamic Member Cards:** Branch cards now fetch and display scrollable, beautiful mini-lists of active staff (avatars/initials, name, department, role).
- **Duplicate Suppression:** Cleaned up identical Head & Manager visual prints. If the branch head and manager are the same user, it renders a single consolidated item (`Head & Manager: [Name]`). If different, it renders uniquely labeled distinct lines.
- **Department Safeguard (Backend):** The `updateBranch` controller scans the branch department mapping array. If a department is deselected from a branch that currently holds active users or active tasks, the backend blocks the operation with a descriptive `400 Bad Request` indicating the exact blocker counts.

---

## Phase 4: Global Enterprise Soft-Delete Pipeline & Modern Split-Pane Viewports

### 🔧 Global Mongoose & Controller Soft-Delete Pipeline (Backend & Database)

**Files changed:**
- [`Branch.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Branch.js)
- [`User.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/User.js)
- [`Task.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Task.js)
- [`Employee.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Employee.js)
- [`Settings.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Settings.js)
- [`Department.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Department.js)
- [`userController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)
- [`userRoutes.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/routes/userRoutes.js)
- [`taskRoutes.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/routes/taskRoutes.js)

**What was done:**
- **Soft-Delete Scheme Overhaul:** Added `isDeleted` (Boolean, default false) and `deletedAt` (Date) globally to Mongoose models. Deleted items are no longer physically expunged.
- **Atomic Deletion Cascades:** Overhauled `deleteUser` in `userController.js` to set `isDeleted: true`, `isActive: false` and cascade tasks (setting `assignedTo = null`, pulling from `assignedTeam`, and soft-deleting corresponding `Employee` profiles).
- **Endpoint Safe Positioning:** Registered `/deleted/all` and `/:id/restore` Recycle Bin REST paths before parametric dynamic routes (`/:id`) in both `userRoutes.js` and `taskRoutes.js` to prevent parametric route collision errors.
- **NoSQL Injection Defense:** All queries utilize strict casting to primitives (e.g. `String(req.params.id)`) to block payload object injection attacks like `?status[$gt]=""`.

---

### 🔧 Overhauled User Management UI & Combobox Filtering

**Files changed:**
- [`UserManagement.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/UserManagement.jsx)
- [`userApi.js`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/services/api/userApi.js)

**What was done:**
- **Split-Pane Edit Modal:** Overhauled the User Modal into a premium dual-pane viewport. 
  - **Left Pane:** Input elements for Name, Email, ID, Contacts, blood group, join date, home address, and dynamic custom fields.
  - **Right Pane:** Tabbed layout panel featuring:
    - *Tab 1 (Affiliation):* Elegant selector controls mapping Assigned Role, Branch Combobox, Department Combobox, and account pipeline toggle status.
    - *Tab 2 (Active Workload):* Displays a real-time searchable card feed of all tasks currently assigned to this user, complete with priority badges and statuses.
- **Searchable Comboboxes:** Integrated reusable `SearchableCombobox` for **Branch** and **Department** options.
- **Cascading Filter Dependency:** Selecting a branch contextually filters down departments and automatically resets user-assigned dropdown values to prevent orphan states.
- **Performance Memoization:** Memoized listing rows (`UserTableRow`) and callbacks (`useCallback`) to guarantee zero re-rendering lag over heavy data loads.
- **Recycle Bin UI:** Added a premium modal showing all soft-deleted users. Admin can restore accounts immediately with 1-click and get live toast feedbacks.

---

### 🔧 Overhauled Task Creation & Edit Modal Viewports

**Files changed:**
- [`CreateTaskModal.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/CreateTaskModal.jsx)
- [`EditTaskModal.jsx`](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/EditTaskModal.jsx)
- [`taskApi.js`](file:///c:/Users/api/taskApi.js)
- [`taskController.js`](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)

**What was done:**
- **Split-Pane Modal Overhaul:** Redesigned task creation and edit interfaces into dual-column panes:
  - **Left Pane:** Core task fields (Title, Description, Due Date, Priority, Estimates - Hours & Minutes).
  - **Right Pane:** Framer Motion tabs:
    - *Tab 1 (Assignment):* Toggles single assignee or team tasks. Integrates `SearchableCombobox` for choosing Branch, Department, and Assignee contextually, cascading filtering criteria, and shows checklists for multiple team members.
    - *Tab 2 (Scope & Assets):* Houses a Collaborating Departments grid checkbox checklist and a dropzone for staged document file uploads.
- **Backend Parity:** Overhauled the backend `updateTask` query to handle all new inputs: `isTeamTask`, `assignedTeam`, and `collaboratingDepartments` with clear assignment overrides.

---

### 🚀 Production Compilation & Build Verification

**What was done:**
- **Installed missing icon packages:** Identified that `react-icons` was missing from `dependencies` and installed it.
- **Build Success:** Ran a complete production compilation (`npm run build`) in Vite, which resolved all modules and compiled successfully with **zero errors and zero warnings**!
