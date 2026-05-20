import { z } from 'zod';

/**
 * Generic request validation middleware
 * Parses body, query, and params against the provided Zod schema
 */
export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errorCode: 'VALIDATION_FAILED',
                message: 'Input validation failed',
                errors: (err.errors || []).map(e => ({
                    field: e.path.join('.').replace(/^(body|query|params)\./, ''),
                    message: e.message
                }))
            });
        }
        next(err);
    }
};

/**
 * Schema for Self Registration / Signup Request
 */
export const registrationSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be under 100 characters'),
        email: z.string().trim().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
        branch: z.string().trim().min(1, 'Branch is required'),
        department: z.string().trim().min(1, 'Department is required'),
        employeeId: z.string().trim().min(1, 'Employee ID is required'),
        role: z.string().trim().optional(),
        designation: z.string().trim().optional(),
        privilegeRequestReason: z.string().trim().optional()
    })
});

/**
 * Schema for Admin User Creation
 */
export const adminCreateUserSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
        email: z.string().trim().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        branch: z.string().trim().min(1, 'Branch is required'),
        department: z.string().trim().min(1, 'Department is required'),
        role: z.string().trim().min(1, 'Role is required'),
        phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
        employeeId: z.string().trim().optional(),
        designation: z.string().trim().optional()
    })
});

/**
 * Schema for Task Creation Payload
 *
 * IMPORTANT: Fields match exactly what CreateTaskModal.jsx sends:
 *   - dueDate  (not "deadline") — from the HTML date input
 *   - assignedTo is OPTIONAL — team tasks send assignedTeam instead
 *   - description is optional — UI label says "Optional description"
 *   - priority, estimatedHours, estimatedMinutes, branch, department are all optional
 */
export const createTaskSchema = z.object({
    body: z.object({
        // Required
        title: z.string().trim().min(1, 'Task title is required').max(200, 'Task title must be under 200 characters'),
        dueDate: z.string()
            .min(1, 'Due date is required')
            .refine(val => !isNaN(Date.parse(val)), { message: 'Invalid due date format' }),

        // Optional description
        description: z.string().trim().max(5000, 'Description must be under 5000 characters').optional().or(z.literal('')),

        // Assignment: individual OR team (controller handles the logic)
        assignedTo: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid assigned user ID format').optional().or(z.literal('')),
        assignedTeam: z.any().optional(),   // JSON string or array — parsed in controller
        isTeamTask: z.any().optional(),     // 'true'/'false' string or boolean — parsed in controller

        // Optional fields
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
        estimatedHours: z.preprocess(
            (val) => (val === undefined || val === '' ? undefined : Number(val)),
            z.number().min(0).optional()
        ),
        estimatedMinutes: z.preprocess(
            (val) => (val === undefined || val === '' ? undefined : Number(val)),
            z.number().int().min(0).max(59).optional()
        ),
        department: z.string().trim().optional().or(z.literal('')),
        branch: z.string().trim().optional().or(z.literal('')),
        taskFormName: z.string().trim().optional().or(z.literal('')),
        taskFormType: z.enum(['pdf', 'image', 'doc', 'other']).optional(),
        taskFormAttachments: z.any().optional(),
        collaboratingDepartments: z.any().optional(),
    })
});
