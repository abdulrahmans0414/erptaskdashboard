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
                errors: err.errors.map(e => ({
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
 */
export const createTaskSchema = z.object({
    body: z.object({
        title: z.string().trim().min(3, 'Task title must be at least 3 characters').max(200, 'Task title must be under 200 characters'),
        description: z.string().trim().min(1, 'Task description is required').max(5000, 'Description must be under 5000 characters'),
        assignedTo: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid assigned user ID format'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        deadline: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid deadline date format' })
            .refine(val => new Date(val) > new Date(), { message: 'Deadline must be in the future' }),
        estimatedMinutes: z.preprocess(
            (val) => (val === undefined || val === '' ? undefined : Number(val)),
            z.number().int().min(5).max(480).optional()
        ),
        taskFormName: z.string().trim().optional(),
        taskFormType: z.enum(['pdf', 'image', 'doc', 'other']).optional(),
        taskFormAttachments: z.array(z.any()).optional(),
        department: z.string().trim().optional(),
        branch: z.string().trim().optional(),
    })
});
