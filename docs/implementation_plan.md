# Implementation Plan: Global Architectural Consistency (Soft-Delete, Split-Pane Modals, Comboboxes & Performance)

This plan details the systematic mirroring of the enterprise-grade patterns built for Branch Management across all core modules: **User Management**, **Task Workflows**, **Profile / EmployeeProfile**, and **System Settings**. It enforces absolute architectural consistency, strict data isolation, database soft-deletion, and hardware-accelerated user interfaces.

---

## User Review Required

> [!IMPORTANT]
> **1. Global Soft-Delete & Atomic Cascade Pipeline**:
> - **Unified Models Schema**: `User.js`, `Task.js`, `Employee.js`, `Settings.js`, and `Department.js` will systematically utilize the `{ isDeleted: { type: Boolean, default: false }, deletedAt: Date }` schema pattern. Hard deletions are strictly forbidden.
> - **Atomic Cascades**: Flip `isDeleted: true` on deletions and propagate cascaded status changes (e.g., when deleting a User, nullify their task assignments or pull them from task teams, and mark their employee profile as inactive/archived) atomically using Mongoose transactions or robust cascades.
> - **Universal Recycle Bin Route**: Expose `/deleted/all` and `/:id/restore` across User and Task route groups, ensuring admins can view and restore data in 1-click.
>
> **2. Standardized Dual-Column Split-Pane Modals**:
> - **User Modal**: Refactored to feature standard text/input forms on the left and a Framer Motion-powered tabbed panel on the right (Tab 1: Role, Branch, Department comboboxes and custom fields; Tab 2: A scrollable, live-filtered Assigned Tasks overview).
> - **Task Creation & Editing Modals**: Refactored to feature core task settings (Title, Description, Due Date, Priority, Estimates) on the left and contextual relations on the right (Tab 1: Assignee Searchable Combobox & Team Members checklist; Tab 2: Collaborating Branches/Departments & File Dropzone).
>
> **3. Dependent Searchable Comboboxes**:
> - Replace raw selects and text dropdown lists in all forms with a reusable, stateful `SearchableCombobox` component with search query filtering, avatar/email tags, and robust keyboard navigation support.
> - Selecting a parent context (e.g. selecting a target Branch in a task or user modal) instantly filters and updates child selection parameters (like departments or assignable employees mapped to that specific branch), eliminating illegal cross-branch assignments.
>
> **4. High-Performance Client Rendering & Injection Defense**:
> - Implement React memoization (`useMemo` and `useCallback`) across all heavy lists (e.g., User list, Task boards, Settings grids) to prevent layout shifts or input lagging with 150+ items.
> - Enforce strict string/primitive parameter casting in backend queries to prevent NoSQL query object injection.

---

## Proposed Changes

### 1. Database & Schema Configuration (Backend Models)

#### [MODIFY] [User.js](file:///c:/Users/abdul/Desktop/erp_final/backend/models/User.js)
- Enforce soft-deletion attributes:
  ```javascript
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
  ```

#### [MODIFY] [Task.js](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Task.js)
- Enforce soft-deletion attributes:
  ```javascript
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
  ```

#### [MODIFY] [Employee.js](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Employee.js)
- Enforce soft-deletion attributes:
  ```javascript
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
  ```

#### [MODIFY] [Settings.js](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Settings.js)
- Enforce soft-deletion attributes:
  ```javascript
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
  ```

#### [MODIFY] [Department.js](file:///c:/Users/abdul/Desktop/erp_final/backend/models/Department.js)
- Enforce soft-deletion attributes:
  ```javascript
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
  ```

---

### 2. Backend API Controllers & Routes

#### [MODIFY] [userController.js](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/users/userController.js)
- **getAllUsers, getUserById, getUsersByDepartment, getUsersByBranch**: Inject `{ isDeleted: { $ne: true } }` into all MongoDB query boundaries.
- **deleteUser**: Convert from deactivation to a true soft-delete. Set `isDeleted: true`, `deletedAt: new Date()`, `isActive: false`. Cascade atomically to tasks: if the user is `assignedTo` on active tasks, transition those tasks to `assignedTo: null` (status: 'Unassigned') or remove the user from task teams `assignedTeam`.
- **getDeletedUsers**: New controller endpoint retrieving users with `isDeleted: true`.
- **restoreUser**: New controller endpoint to restore users: set `isDeleted: false`, `isActive: true`.
- **Security Casting**: Enforce strict string casting for all query filters (`req.query.search`, `req.query.branch`, `req.query.department`) to prevent NoSQL object injection.

#### [MODIFY] [taskController.js](file:///c:/Users/abdul/Desktop/erp_final/backend/controllers/tasks/taskController.js)
- **getTasks, getDepartmentTasks, getTeamTasks, getDashboardStats, getEmployeeSummary**: Inject `{ isDeleted: { $ne: true } }` systematically to purge soft-deleted tasks from current workflow displays and analytical summaries.
- **deleteTask**: Convert from a physical `deleteOne` to a soft-delete pipeline. Flip `isDeleted: true`, `deletedAt: new Date()`. Preserve attachments on soft-delete to allow potential restoration.
- **getDeletedTasks**: New controller endpoint retrieving tasks with `isDeleted: true`.
- **restoreTask**: New controller endpoint resetting `isDeleted: false`.
- **Security Casting**: Enforce primitive casting for all filter query criteria.

#### [MODIFY] [userRoutes.js](file:///c:/Users/abdul/Desktop/erp_final/backend/routes/userRoutes.js)
- Expose `GET /deleted/all` and `POST /:id/restore` (authorized for `admin` only), registered prior to parametric routes to prevent conflicts.

#### [MODIFY] [taskRoutes.js](file:///c:/Users/abdul/Desktop/erp_final/backend/routes/taskRoutes.js)
- Expose `GET /deleted/all` and `POST /:id/restore` (authorized for `admin` and heads/managers), registered prior to parametric routes.

---

### 3. Reusable Frontend Modular Components

#### [NEW] [SearchableCombobox.jsx](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Common/SearchableCombobox.jsx)
- Build a modular, reusable, high-performance combobox:
  - Custom searchable filter input.
  - Smooth spring animations for overlay dropdowns.
  - Avatar, designation, and email previews.
  - Support for multi-dependent cascading updates (e.g. resetting selection when target branch changes).

---

### 4. Client Viewports & Forms Overhaul

#### [MODIFY] [userApi.js](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/services/api/userApi.js)
- Expose `getDeletedUsers` (`/users/deleted/all`) and `restoreUser` (`/users/:id/restore`).

#### [MODIFY] [taskApi.js](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/services/api.js) (or task endpoints)
- Expose `getDeletedTasks` (`/tasks/deleted/all`) and `restoreTask` (`/tasks/:id/restore`).

#### [MODIFY] [UserManagement.jsx](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Admin/UserManagement.jsx)
- **Split-Pane Modal Layout**: Overhaul user editing/creation modal into a dual-column split:
  - Left column: Name, Email, Password, Employee ID, Phone, Address, Blood Group fields.
  - Right column: Tabbed section:
    - **Tab 1: Affiliation**: Branch (Combobox), Department (Combobox), Role selection, active checkbox, and custom fields.
    - **Tab 2: Task Board**: A scrollable panel displaying the user's active assigned tasks with a real-time live search filter.
- **Searchable Comboboxes**: Integrate `SearchableCombobox` for selecting Branch and Department. Changing the branch immediately clears and dynamically filters departments.
- **Recycle Bin UI**: Add a Recycle Bin overlay to display soft-deleted users and restore them instantly.
- **Performance Optimization**: Memoize table rows (`useMemo`) and state change callbacks (`useCallback`) to guarantee lag-free rendering.
- **Banner Error Notifications**: Integrate absolute banners for displaying backend validation errors.

#### [MODIFY] [CreateTaskModal.jsx](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/CreateTaskModal.jsx) & [EditTaskModal.jsx](file:///c:/Users/abdul/Desktop/erp_final/frontend/src/components/Tasks/EditTaskModal.jsx)
- **Split-Pane Modal Layout**: Refactor into a dual-column layout:
  - Left column: Core task parameters (Title, Description, Due Date, Priority, Estimates).
  - Right column: Tabbed panels:
    - **Tab 1: Assignment**: Combobox to select Assignee with avatar, role, and branch matching filters, or Team checklist.
    - **Tab 2: Scope & Assets**: Collaborating Departments/Branches matrix checkboxes, and Form attachments dropzone.
- **Searchable Comboboxes**: Integrate modular `SearchableCombobox` for choosing Branch, Department, and Assignees. Selecting a branch dynamically clears and filters the assignable users down to those matching the branch.
- **Performance Optimization**: Memoize selection filters and calculations.

---

## Verification Plan

### Automated Verification
- Run backend unit tests or inspect logs for correct execution.
- Validate that the React app compiles cleanly with zero warnings:
  ```bash
  cd frontend && npm run build
  ```

### Manual Verification
1. **User Soft-Delete & Restore**:
   - Soft-delete a user from User Management. Verify they disappear from the active grid.
   - Open User Recycle Bin, verify the deleted user is listed, and click "Restore". Confirm they are reactivated immediately.
2. **Task Soft-Delete & Restore**:
   - Soft-delete a task from Tasks interface. Verify it disappears from active kanbans/lists.
   - Open Task Recycle Bin, click "Restore", and confirm it returns to its active board with all attempts and logs intact.
3. **Split-Pane Modal UI**:
   - Open Add User / Edit User modal. Confirm smooth layout across mobile and desktop.
   - Switch between tabs (Affiliation vs. Task Board) on the edit user modal, testing search filters.
4. **Dependent Searchable Comboboxes**:
   - In Create Task modal, choose Branch " Kursi". Confirm the assignable users are immediately filtered to only show Kursi-based employees, and child departments adjust correctly.
5. **High-Performance Verification**:
   - Render 150+ users and tasks. Filter quickly in the search bars and confirm zero input lag or physical layout shifts.
