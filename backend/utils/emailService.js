import nodemailer from 'nodemailer';
import dns from 'dns';

import Settings from '../models/Settings.js';
import EmailLog from '../models/EmailLog.js';
import eventBus, { EVENTS } from './eventBus.js';
import logger from '../logger.js';

// ── Transporter ────────────────────────
const createTransporter = async () => {
    let host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    let port = parseInt(process.env.EMAIL_PORT, 10) || 587;
    // Strip spaces from Gmail App Passwords (common copy-paste issue)
    let user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
    let pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : '';

    try {
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings?.emailConfig?.user && settings?.emailConfig?.pass) {
            host = settings.emailConfig.host || host;
            port = parseInt(settings.emailConfig.port, 10) || port;
            user = settings.emailConfig.user.trim();
            pass = settings.emailConfig.pass.replace(/\s/g, '');
        }
    } catch (e) {
        console.error('Failed to load email settings from DB, using .env fallback.', e);
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: {
            rejectUnauthorized: false // Allow self-signed certs in dev
        },
        lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, callback);
        },
        family: 4 // Force IPv4 to prevent connection issues on IPv6-unfriendly networks
    });
};

// ── Transporter Wrapper with Fallback ────────────────────────────
const sendMailWithFallback = async (mailOptions, forceEnv = false) => {
    let host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    let port = parseInt(process.env.EMAIL_PORT, 10) || 587;
    let user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
    let pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : '';
    let usedDbConfig = false;

    if (!forceEnv) {
        try {
            const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
            if (settings?.emailConfig?.user && settings?.emailConfig?.pass) {
                host = settings.emailConfig.host || host;
                port = parseInt(settings.emailConfig.port, 10) || port;
                user = settings.emailConfig.user.trim();
                pass = settings.emailConfig.pass.replace(/\s/g, '');
                usedDbConfig = true;
            }
        } catch (e) {
            console.error('Failed to load email settings from DB, using .env fallback.', e);
        }
    }

    let transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false },
        lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, callback);
        },
        family: 4 // Force IPv4 to prevent connection issues on IPv6-unfriendly networks
    });

    try {
        logger.info(`📧 Attempting to send email to ${mailOptions.to} (attachments: ${!!mailOptions.attachments})`);
        return await transporter.sendMail(mailOptions);
    } catch (error) {
        const errorMsg = (error?.message || String(error)).toLowerCase();
        let currentOptions = { ...mailOptions };

        logger.warn(`📧 Email send failed: ${error.message}`);

        // Fallback 1: If ANY error occurs and we have attachments, strip them.
        if (currentOptions.attachments) {
            logger.warn(`⚠️ Email failed to send with attachments (${errorMsg}). Retrying without attachments...`);
            
            delete currentOptions.attachments; // completely remove attachments
            
            const noticeHtml = `
                <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:16px 20px;margin-top:20px;">
                    <p style="color:#9a3412;font-size:13px;font-weight:700;margin:0 0 6px;">📎 Attachments Notice:</p>
                    <p style="color:#c2410c;font-size:13px;margin:0;line-height:1.5;">
                        Some file attachments could not be delivered via email due to server restrictions or network issues. Please log in to the TaskGrid ERP platform to view them securely.
                    </p>
                </div>
            `;
            if (currentOptions.html) {
                currentOptions.html = currentOptions.html.replace('</div>\n                        </td>\n                    </tr>\n                    <!-- Footer -->', noticeHtml + '\n</div>\n                        </td>\n                    </tr>\n                    <!-- Footer -->');
            }

            try {
                logger.info(`📧 Retrying email send to ${currentOptions.to} WITHOUT attachments`);
                return await transporter.sendMail(currentOptions);
            } catch (err2) {
                logger.error(`❌ Retry without attachments failed: ${err2.message}`);
                error = err2; // Update error and fall down to Fallback 2
            }
        }
        
        // Fallback 2: Fix 535 Bad Credentials if DB config is invalid
        const newErrorMsg = (error?.message || String(error)).toLowerCase();
        if (usedDbConfig && (error?.responseCode === 535 || newErrorMsg.includes('535') || newErrorMsg.includes('auth') || newErrorMsg.includes('login') || newErrorMsg.includes('credentials'))) {
            logger.warn('⚠️ DB Email credentials failed. Falling back to .env credentials...');
            return await sendMailWithFallback({
                ...currentOptions, // Uses the stripped options if Fallback 1 ran!
                from: `"TaskGrid ERP" <${process.env.EMAIL_USER}>` 
            }, true);
        }
        
        throw error;
    }
};

// ── Common Styles ────────────────────────────────────────────────
const styles = {
    body: 'margin:0;padding:0;background:#f1f5f9;font-family:"Segoe UI",Arial,sans-serif;',
    container: 'background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;',
    header: (color) => `background:linear-gradient(135deg,${color});padding:36px 40px;text-align:center;`,
    headerTitle: 'color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;',
    headerSubtitle: 'color:#bfdbfe;margin:6px 0 0;font-size:13px;',
    content: 'padding:40px;',
    footer: 'background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;',
    footerText: 'color:#94a3b8;font-size:11px;margin:0;',
};

const createEmailTemplate = ({ 
    headerTitle = 'SPIS Task Controller',
    headerSubtitle = '',
    content = '',
    footerText = '© 2024 Scholars Paradise International School'
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;font-size:1px;color:#f4f7fa;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${headerSubtitle || headerTitle}</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fa;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);border:1px solid #e1e8f0;">
                    <!-- Branding Header -->
                    <tr>
                        <td style="padding:40px 40px 30px;background-color:#ffffff;text-align:center;">
                            <div style="font-size:24px;font-weight:800;color:#1e40af;letter-spacing:-0.5px;margin-bottom:8px;">
                                <span style="background:linear-gradient(135deg,#2563eb,#1e40af);-webkit-background-clip:text;color:transparent;">SPIS</span> Task Controller
                            </div>
                            <div style="height:4px;width:40px;background:#2563eb;margin:0 auto;border-radius:2px;"></div>
                        </td>
                    </tr>
                    <!-- Hero Section -->
                    <tr>
                        <td style="padding:0 40px 40px;text-align:center;">
                            <h1 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">${headerTitle}</h1>
                            ${headerSubtitle ? `<p style="margin:10px 0 0;font-size:15px;color:#64748b;line-height:1.5;">${headerSubtitle}</p>` : ''}
                        </td>
                    </tr>
                    <!-- Main Body Content -->
                    <tr>
                        <td style="padding:0 40px 40px;font-size:16px;line-height:1.6;color:#334155;">
                            <div style="padding:30px;background-color:#f8fafc;border-radius:12px;border:1px solid #f1f5f9;">
                                ${content}
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:30px 40px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
                            <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;font-weight:500;">Scholars Paradise International School</p>
                            <p style="margin:0;font-size:11px;color:#cbd5e1;letter-spacing:0.5px;">${footerText}</p>
                        </td>
                    </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin-top:20px;">
                    <tr>
                        <td align="center" style="font-size:11px;color:#94a3b8;line-height:1.5;">
                            This is an automated notification from your SPIS Task Controller. Please do not reply to this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

// ── Send OTP Email ──────────────────────────────────────────────
export const sendOTPEmail = async (toEmail, userName, otp, otpExpiresAt) => {
    try {
        const transporter = await createTransporter();
        const expiryStr = new Date(otpExpiresAt).toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });

        const content = `
            <p style="color:#334155;font-size:16px;margin:0 0 8px;">Hello <strong>${userName}</strong> 👋</p>
            <p style="color:#64748b;font-size:14px;margin:0 0 28px;line-height:1.6;">
                Great news! Your registration has been 
                <strong style="color:#16a34a;">approved</strong> by the admin. 
                Use the OTP below to activate your account.
            </p>

            <!-- OTP Box -->
            <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
                <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">
                    One-Time Password
                </p>
                <div style="
                    font-size:48px;
                    font-weight:800;
                    letter-spacing:16px;
                    color:#1e40af;
                    font-family:'Courier New',monospace;
                    padding:10px 0;
                    user-select:all;
                ">${otp}</div>
                <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">
                    ⏰ Valid until <strong style="color:#dc2626;">${expiryStr}</strong>
                </p>
            </div>

            <!-- Steps -->
            <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="color:#1e3a8a;font-size:13px;font-weight:700;margin:0 0 10px;">
                    📋 How to activate:
                </p>
                <ol style="color:#1e40af;font-size:13px;margin:0;padding-left:18px;line-height:1.8;">
                    <li>Open <strong>TaskGrid ERP Login</strong></li>
                    <li>Click on <strong>"Verify OTP"</strong></li>
                    <li>Enter your email: <strong>${toEmail}</strong></li>
                    <li>Enter the OTP shown above</li>
                    <li>Click <strong>"Activate Account"</strong></li>
                </ol>
            </div>

            <!-- Security Warning -->
            <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                <p style="color:#dc2626;font-size:12px;margin:0;">
                    ⚠️ <strong>Security:</strong> Never share this OTP with anyone. 
                    If you did not request this, please ignore this email.
                </p>
            </div>

            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
                Need help? Contact your system administrator.
            </p>
        `;

        const textFallback = `Hello ${userName},\n\nYour registration has been approved.\nUse this OTP to activate your account: ${otp}\nValid until: ${expiryStr}\n\nSecurity: Never share this OTP with anyone.`;

        await sendMailWithFallback({
            from: `"SPIS Task Controller" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `OTP: ${otp} - Activate Your SPIS Account`,
            text: textFallback,
            html: createEmailTemplate({
                headerTitle: 'SPIS Task Controller',
                headerSubtitle: 'Account Activation',
                content,
            }),
        });

        // Log the email
        await EmailLog.create({
            recipient: toEmail,
            subject: `OTP: ${otp} - Activate Your SPIS Account`,
            type: 'OTP',
            contentSnippet: `OTP: ${otp}`,
            status: 'sent'
        });
        eventBus.emit('data_change', { type: EVENTS.EMAIL_LOG_UPDATED });

        console.log(`✅ OTP email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('❌ OTP email error:', error.message);
        // Log failure
        await EmailLog.create({
            recipient: toEmail,
            subject: `OTP: ${otp} - Activate Your SPIS Account`,
            type: 'OTP',
            status: 'failed',
            error: error.message
        });
        eventBus.emit('data_change', { type: EVENTS.EMAIL_LOG_UPDATED });
        return false;
    }
};

// ── Send Welcome Email ──────────────────────────────────────────
export const sendWelcomeEmail = async (toEmail, userName, role, department) => {
    try {
        const transporter = await createTransporter();

        const content = `
            <p style="color:#334155;font-size:16px;margin:0 0 20px;">
                Congratulations <strong>${userName}</strong>! 🎉
            </p>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;">
                Your <strong>TaskGrid ERP</strong> account has been successfully activated. 
                You can now access the performance management system.
            </p>

            <!-- Account Details Card -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="color:#15803d;font-size:13px;font-weight:700;margin:0 0 12px;">
                    📋 Account Details
                </p>
                <div style="display:grid;gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;color:#166534;font-size:13px;">
                        <span>📧</span>
                        <span><strong>Email:</strong> ${toEmail}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;color:#166534;font-size:13px;">
                        <span>👤</span>
                        <span><strong>Role:</strong> <span style="text-transform:capitalize;">${role?.replace(/-/g, ' ')}</span></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;color:#166534;font-size:13px;">
                        <span>🏢</span>
                        <span><strong>Department:</strong> ${department}</span>
                    </div>
                </div>
            </div>

            <!-- Quick Start -->
            <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <p style="color:#1e3a8a;font-size:13px;font-weight:700;margin:0 0 8px;">
                    🚀 Get Started:
                </p>
                <ul style="color:#1e40af;font-size:13px;margin:0;padding-left:18px;line-height:1.8;">
                    <li>Login with your email & password</li>
                    <li>View your assigned tasks</li>
                    <li>Update task progress</li>
                    <li>Submit completed tasks for review</li>
                </ul>
            </div>

            <div style="text-align:center;margin-top:24px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="display:inline-block;background:#16a34a;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                    Login to TaskGrid ERP →
                </a>
            </div>
        `;

        await sendMailWithFallback({
            from: `"TaskGrid ERP" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: '✅ Welcome to TaskGrid ERP – Account Activated!',
            html: createEmailTemplate({
                headerColor: '#16a34a,#059669',
                headerIcon: '🎉',
                headerTitle: `Welcome, ${userName}!`,
                headerSubtitle: 'Your account is now active',
                content,
            }),
        });

        await EmailLog.create({
            recipient: toEmail,
            subject: '✅ Welcome to TaskGrid ERP – Account Activated!',
            type: 'WELCOME',
            status: 'sent'
        });
        eventBus.emit('data_change', { type: EVENTS.EMAIL_LOG_UPDATED });

        console.log(`✅ Welcome email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Welcome email error:', error.message);
        return false;
    }
};

// ── Task Notification Emails ────────────────────────────────────
const taskEmailConfigs = {
    TASK_ASSIGNED: {
        headerColor: '#2563eb,#1d4ed8',
        headerIcon: '📋',
        headerTitle: 'New Task Assigned',
        headerSubtitle: '',
        badgeColor: '#eff6ff',
        badgeTextColor: '#1e40af',
        badgeIcon: '📌',
    },
    TASK_SUBMITTED: {
        headerColor: '#7c3aed,#6d28d9',
        headerIcon: '📤',
        headerTitle: 'Task Submitted for Review',
        headerSubtitle: '',
        badgeColor: '#faf5ff',
        badgeTextColor: '#6b21a8',
        badgeIcon: '✅',
    },
    TASK_APPROVED: {
        headerColor: '#16a34a,#059669',
        headerIcon: '✅',
        headerTitle: 'Task Approved!',
        headerSubtitle: 'Great work!',
        badgeColor: '#f0fdf4',
        badgeTextColor: '#15803d',
        badgeIcon: '🌟',
    },
    TASK_REJECTED: {
        headerColor: '#dc2626,#b91c1c',
        headerIcon: '❌',
        headerTitle: 'Task Needs Rework',
        headerSubtitle: 'Action Required',
        badgeColor: '#fef2f2',
        badgeTextColor: '#dc2626',
        badgeIcon: '🔄',
    },
    TASK_UPDATED: {
        headerColor: '#f59e0b,#d97706',
        headerIcon: '🔄',
        headerTitle: 'Task Updated',
        headerSubtitle: '',
        badgeColor: '#fffbeb',
        badgeTextColor: '#b45309',
        badgeIcon: '📝',
    },
};

export const sendEmailNotification = async (toEmail, type, data, attachments = []) => {
    try {
        const transporter = await createTransporter();
        const config = taskEmailConfigs[type];
        
        if (!config || !toEmail) {
            console.warn(`⚠️ Invalid email config or missing email for type: ${type}`);
            return false;
        }

        const content = `
            <p style="color:#334155;font-size:16px;margin:0 0 8px;">
                Hello <strong>${data.employeeName || 'User'}</strong> 👋
            </p>
            
            <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;">
                ${getTaskMessage(type, data)}
            </p>

            <!-- Task Details Card -->
            <div style="background:${config.badgeColor};border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <span style="font-size:18px;">${config.badgeIcon}</span>
                    <span style="color:${config.badgeTextColor};font-size:13px;font-weight:700;">
                        Task Details
                    </span>
                </div>
                <div style="display:grid;gap:6px;">
                    <div style="display:flex;align-items:center;gap:8px;color:#334155;font-size:13px;">
                        <span>📝</span>
                        <span><strong>Task:</strong> ${data.taskTitle || 'N/A'}</span>
                    </div>
                    ${data.dueDate ? `
                    <div style="display:flex;align-items:center;gap:8px;color:#334155;font-size:13px;">
                        <span>📅</span>
                        <span><strong>Due:</strong> ${new Date(data.dueDate).toLocaleDateString('en-IN', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</span>
                    </div>` : ''}
                    ${data.priority ? `
                    <div style="display:flex;align-items:center;gap:8px;color:#334155;font-size:13px;">
                        <span>🏷️</span>
                        <span><strong>Priority:</strong> 
                            <span style="
                                display:inline-block;
                                padding:2px 10px;
                                border-radius:12px;
                                font-size:11px;
                                font-weight:600;
                                ${getPriorityStyle(data.priority)}
                            ">${data.priority}</span>
                        </span>
                    </div>` : ''}
                    ${data.department ? `
                    <div style="display:flex;align-items:center;gap:8px;color:#334155;font-size:13px;">
                        <span>🏢</span>
                        <span><strong>Department:</strong> ${data.department}</span>
                    </div>` : ''}
                </div>
            </div>

            ${data.feedback ? `
            <div style="background:#f8fafc;border-left:4px solid #64748b;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <p style="color:#475569;font-size:13px;font-weight:700;margin:0 0 6px;">
                    💬 Feedback/Note:
                </p>
                <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5;">
                    ${data.feedback}
                </p>
            </div>` : ''}

            <div style="text-align:center;margin-top:24px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks" 
                   style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                    View Tasks →
                </a>
            </div>
        `;

        const subject = getTaskSubject(type, data);

        // Format attachments for nodemailer
        const mailAttachments = (attachments || []).map(att => {
            if (!att.fileUrl) return null;
            
            // Clean up backslashes (especially on Windows where path joins might have corrupted URLs)
            let cleanUrl = att.fileUrl.replace(/\\/g, '/');
            
            // If the URL has a protocol, or contains a remote host, handle it
            if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.includes('res.cloudinary.com')) {
                // Ensure proper protocol format
                if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                    // Fix cases like 'https:/res.cloudinary.com' or 'https:res.cloudinary.com'
                    cleanUrl = cleanUrl.replace(/^(https?:)\/*/, '$1//');
                }
                return {
                    filename: att.filename,
                    href: cleanUrl
                };
            }
            
            // Fallback for legacy local disk uploads uses 'path'
            return {
                filename: att.filename,
                path: process.cwd() + (cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl)
            };
        }).filter(Boolean);

        await sendMailWithFallback({
            from: `"TaskGrid ERP" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject,
            html: createEmailTemplate({
                headerColor: config.headerColor,
                headerIcon: config.headerIcon,
                headerTitle: config.headerTitle,
                headerSubtitle: config.headerSubtitle,
                content,
            }),
            attachments: mailAttachments.length > 0 ? mailAttachments : undefined
        });

        // Log the notification
        await EmailLog.create({
            recipient: toEmail,
            subject,
            type,
            taskId: data.taskId || null,
            senderId: data.senderId || null,
            contentSnippet: data.feedback ? data.feedback.substring(0, 200) : '',
            attachments: (attachments || []).map(a => ({
                filename: a.filename,
                fileUrl: a.fileUrl,
                fileSize: a.fileSize
            })),
            status: 'sent'
        });
        eventBus.emit('data_change', { type: EVENTS.EMAIL_LOG_UPDATED });

        console.log(`✅ ${type} email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error(`❌ ${type} email error:`, error.message);
        // Log failure
        try {
            await EmailLog.create({
                recipient: toEmail,
                subject: getTaskSubject(type, data),
                type,
                taskId: data.taskId || null,
                status: 'failed',
                error: error.message
            });
            eventBus.emit('data_change', { type: EVENTS.EMAIL_LOG_UPDATED });
        } catch (logErr) {
            console.error('Failed to log failed email:', logErr);
        }
        return false;
    }
};

// ── Helper Functions ────────────────────────────────────────────
const getTaskMessage = (type, data) => {
    const messages = {
        TASK_ASSIGNED: `A new task has been assigned to you. Please review the task details and start working on it.`,
        TASK_SUBMITTED: `<strong>${data.employeeName}</strong> has submitted a task for your review.`,
        TASK_APPROVED: `Congratulations! Your task has been <strong style="color:#16a34a;">approved</strong>. Keep up the great work! 🎉`,
        TASK_REJECTED: `Your task requires some changes. Please review the feedback below and resubmit.`,
        TASK_UPDATED: `A task has been updated. Please check the details below.`,
    };
    return messages[type] || 'Task notification from TaskGrid ERP.';
};

const getTaskSubject = (type, data) => {
    const subjects = {
        TASK_ASSIGNED: `📋 New Task: ${data.taskTitle}`,
        TASK_SUBMITTED: `📤 Review Required: ${data.taskTitle}`,
        TASK_APPROVED: `✅ Approved: ${data.taskTitle}`,
        TASK_REJECTED: `❌ Rework Needed: ${data.taskTitle}`,
        TASK_UPDATED: `🔄 Updated: ${data.taskTitle}`,
    };
    return subjects[type] || '[TaskGrid] Task Update';
};

const getPriorityStyle = (priority) => {
    const styles = {
        high: 'background:#fef2f2;color:#dc2626;',
        medium: 'background:#fffbeb;color:#b45309;',
        low: 'background:#f0fdf4;color:#15803d;',
        urgent: 'background:#fef2f2;color:#dc2626;font-weight:700;',
    };
    return styles[priority?.toLowerCase()] || 'background:#f1f5f9;color:#475569;';
};

// ── Resend Logged Email ─────────────────────────────────────────
export const resendLoggedEmail = async (logId) => {
    const log = await EmailLog.findById(logId);
    if (!log) {
        throw new Error('Email log not found');
    }

    const { recipient, type, taskId, subject, contentSnippet } = log;

    // 1. Resending OTP
    if (type === 'OTP') {
        const PendingRegistration = (await import('../models/PendingRegistration.js')).default;
        const pending = await PendingRegistration.findOne({ email: recipient.toLowerCase().trim() });
        
        let otp = '';
        if (pending && pending.otp) {
            otp = pending.otp;
        } else {
            // Extract from subject line using regex
            const otpMatch = subject.match(/OTP:\s*(\d+)/i);
            if (otpMatch) {
                otp = otpMatch[1];
            } else {
                otp = contentSnippet.replace('OTP: ', '').trim();
            }
        }

        // If still empty (e.g. log was totally corrupt/empty), let's generate a temporary valid one
        // and sync it to the PendingRegistration database so the user can actually use it!
        if (!otp && pending) {
            otp = Math.floor(100000 + Math.random() * 900000).toString();
            pending.otp = otp;
            pending.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await pending.save();
        } else if (!otp) {
            otp = Math.floor(100000 + Math.random() * 900000).toString();
        }

        const name = pending ? pending.name : 'User';
        const expiry = pending ? pending.otpExpiresAt : new Date(Date.now() + 15 * 60 * 1000);
        return await sendOTPEmail(recipient, name, otp, expiry);
    }

    // 2. Resending WELCOME
    if (type === 'WELCOME') {
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: recipient });
        const name = user ? user.name : 'User';
        const role = user ? user.role : 'employee';
        const dept = user ? user.department : 'General';
        return await sendWelcomeEmail(recipient, name, role, dept);
    }

    // 3. Resending Task Notifications (TASK_ASSIGNED, TASK_SUBMITTED, TASK_APPROVED, TASK_REJECTED, TASK_UPDATED)
    if (['TASK_ASSIGNED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_UPDATED'].includes(type)) {
        const Task = (await import('../models/Task.js')).default;
        const User = (await import('../models/User.js')).default;

        let resolvedTaskId = taskId;
        if (!resolvedTaskId && subject) {
            // Remove prefix emojis and text: e.g. "📋 New Task: Setup Server" -> "Setup Server"
            const titleMatch = subject.replace(/^[^:]+:\s*/, '').trim();
            if (titleMatch) {
                const escapedTitle = titleMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                try {
                    const matchedTask = await Task.findOne({
                        title: { $regex: new RegExp('^' + escapedTitle + '$', 'i') }
                    }).select('_id');
                    if (matchedTask) {
                        resolvedTaskId = matchedTask._id;
                    }
                } catch (err) {
                    console.error('Failed to match task title on resend:', err);
                }
            }
        }

        const task = resolvedTaskId ? await Task.findById(resolvedTaskId) : null;
        if (!task) {
            // If the task was deleted, let's fall back to sending a static copy using the log data
            const fallbackContent = `
                <p style="color:#334155;font-size:16px;margin:0 0 12px;">Hello 👋</p>
                <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;">
                    This is a resent task notification. The associated task is no longer available, but here was the recorded content:
                </p>
                <div style="background:#f8fafc;border-left:4px solid #cbd5e1;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                    <p style="color:#475569;font-size:13px;font-weight:700;margin:0 0 6px;">Recorded Note:</p>
                    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.5;">${contentSnippet || 'No recorded note.'}</p>
                </div>
            `;
            await sendMailWithFallback({
                from: `"TaskGrid ERP" <${process.env.EMAIL_USER}>`,
                to: recipient,
                subject: `[RESENT] ${subject}`,
                html: createEmailTemplate({
                    headerTitle: 'Resent Notification',
                    headerSubtitle: 'Original task not found',
                    content: fallbackContent
                })
            });
            return true;
        }

        // If task exists, reconstruct full details
        const employee = await User.findOne({ email: recipient }) || await User.findById(task.assignedTo);
        const employeeName = employee ? employee.name : 'Employee';
        
        const data = {
            employeeName,
            taskTitle: task.title,
            dueDate: task.dueDate,
            priority: task.priority,
            department: task.department,
            feedback: contentSnippet || task.description,
            taskId: task._id,
            senderId: log.senderId
        };

        return await sendEmailNotification(recipient, type, data, log.attachments);
    }

    throw new Error(`Unsupported email type for resending: ${type}`);
};