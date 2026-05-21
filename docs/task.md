# Global Architectural Consistency Execution Tasks

- `[x]` Step 1: Update backend Mongoose models (`User.js`, `Task.js`, `Employee.js`, `Settings.js`, `Department.js`) to support soft-deletion schema (`isDeleted`, `deletedAt`)
- `[x]` Step 2: Implement Soft-Delete, Cascades, and Restore routes/controllers in `userController.js` and `taskController.js`, matching the Branch Management architecture
- `[x]` Step 3: Overhaul other active backend queries in `userController.js` and `taskController.js` to systematically filter soft-deleted items & protect against NoSQL object injection
- `[x]` Step 4: Build the modular reusable `SearchableCombobox.jsx` frontend component
- `[x]` Step 5: Overhaul `UserManagement.jsx` to introduce:
  - Dual-column split-pane layout modal (Affiliation vs. Active Tasks board)
  - Integrated searchable dependent Comboboxes for Branch & Department
  - User Recycle Bin UI & 1-click restore functionality
  - Absolute Banner Notifications for inline error reporting
  - Memoized rendering and callback optimizations
- `[x]` Step 6: Overhaul `CreateTaskModal.jsx` and `EditTaskModal.jsx` to introduce:
  - Dual-column split-pane layout modals (Task details vs. Tab 1: Assignment, Tab 2: Scope & Assets)
  - Searchable Comboboxes for Branch, Department, and Assignees with dependent filters
  - Performance memoization
- `[x]` Step 7: Verify backend routes and run frontend Vite build to ensure zero errors or warnings
