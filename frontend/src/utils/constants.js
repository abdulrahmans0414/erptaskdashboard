export const ROLES = {
    ADMIN: 'admin',
    DEPARTMENT_HEAD: 'department-head',
    BRANCH_HEAD: 'branch-head',
    HR: 'hr',
    IT: 'it',
    GRAPHIC: 'graphic',
    EMPLOYEE: 'employee'
};

export const TASK_STATUSES = {
    NOT_STARTED: 'not-started',
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    COMPLETED: 'completed',
    REJECTED: 'rejected'
};

export const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

export const BRANCHES = [
    "Gaurabagh",
    "Vikas Nagar",
    "Kalyanpur",
    "Kursi",
    "Hive",
    "Ring Road",
    "Muazzam Nagar",
    "Aziz Nagar"
];

export const DEPARTMENTS = [
    "IT",
    "HR",
    "Graphic",
    "Academic",
    "Finance",
    "Marketing",
    "Legal",
    "Transport",
    "Operations"
];

export const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "in-progress": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  submitted: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export const PRIORITY_BADGE = {
  low: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  medium: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  urgent: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export const ROLE_PILL = {
  admin: "bg-purple-100 text-purple-700",
  "branch-head": "bg-indigo-100 text-indigo-700",
  "department-head": "bg-blue-100 text-blue-700",
  hr: "bg-pink-100 text-pink-700",
  it: "bg-cyan-100 text-cyan-700",
  graphic: "bg-fuchsia-100 text-fuchsia-700",
  employee: "bg-slate-100 text-slate-700",
};
