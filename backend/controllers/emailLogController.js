import EmailLog from '../models/EmailLog.js';
import { resendLoggedEmail } from '../utils/emailService.js';
import { fetchGmailMails } from '../utils/gmailImapService.js';
import { ImapFlow } from 'imapflow';
import Settings from '../models/Settings.js';

// @desc    Get all email logs (directly from Gmail IMAP with MongoDB fallback)
// @route   GET /api/email-logs
// @access  Private
export const getEmailLogs = async (req, res) => {
    try {
        const { page = 1, limit = 15, search = '', type, status } = req.query;
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        // Try fetching real-time emails directly from Gmail IMAP first!
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                // Map frontend folder and type filters to IMAP folder/type scopes
                let folder = 'ALL';
                if (status === 'sent') {
                    folder = 'SENT';
                } else if (status === 'failed') {
                    folder = 'FAILED';
                }

                let mappedType = 'ALL';
                if (type === 'OTP') {
                    mappedType = 'SECURITY';
                } else if (type === 'WELCOME') {
                    mappedType = 'WELCOME';
                } else if (type === 'TASK_ASSIGNED' || type === 'TASKS') {
                    mappedType = 'TASKS';
                }

                const result = await fetchGmailMails(req.user.email, req.user.role, {
                    folder,
                    search,
                    limit: limitNumber,
                    page: pageNumber,
                    type: mappedType
                });

                return res.status(200).json({
                    success: true,
                    data: result.mails,
                    pagination: {
                        total: result.total,
                        page: result.page,
                        pages: result.pages,
                        limit: result.limit
                    }
                });
            } catch (imapError) {
                console.warn('⚠️ Gmail IMAP fetch failed, falling back to MongoDB logs:', imapError.message);
            }
        }

        // ==================== FALLBACK: MONGO DB LOGS ====================
        const queryFilter = {};

        // Security scoping for non-admins
        if (req.user.role !== 'admin') {
            queryFilter.$or = [
                { recipient: req.user.email.toLowerCase().trim() },
                { senderId: req.user._id }
            ];
        }

        // Keyword Search
        if (search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            const searchCondition = {
                $or: [
                    { recipient: searchRegex },
                    { subject: searchRegex },
                    { contentSnippet: searchRegex }
                ]
            };

            if (queryFilter.$or) {
                queryFilter.$and = [
                    { $or: queryFilter.$or },
                    searchCondition
                ];
                delete queryFilter.$or;
            } else {
                Object.assign(queryFilter, searchCondition);
            }
        }

        // Map frontend categories to local DB fields
        if (type && type !== 'ALL') {
            queryFilter.type = type;
        }

        if (status && status !== 'ALL') {
            queryFilter.status = status;
        }

        const totalLogs = await EmailLog.countDocuments(queryFilter);
        const logs = await EmailLog.find(queryFilter)
            .populate('taskId', 'title description priority dueDate status')
            .populate('senderId', 'name email role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total: totalLogs,
                page: pageNumber,
                pages: Math.ceil(totalLogs / limitNumber),
                limit: limitNumber
            }
        });
    } catch (error) {
        console.error('Error fetching email logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch email logs',
            error: error.message
        });
    }
};

// @desc    Delete an email (Directly from Gmail IMAP or MongoDB fallback)
// @route   DELETE /api/email-logs/:id
// @access  Private
export const deleteEmailLog = async (req, res) => {
    try {
        const idOrUid = req.params.id;

        // 1. If it's a Gmail IMAP UID (numeric string), delete directly from Gmail!
        if (/^\d+$/.test(idOrUid)) {
            try {
                let user = process.env.EMAIL_USER;
                let pass = process.env.EMAIL_PASS;

                const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
                if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
                    user = settings.emailConfig.user;
                    pass = settings.emailConfig.pass;
                }

                if (user && pass) {
                    const client = new ImapFlow({
                        host: 'imap.gmail.com',
                        port: 993,
                        secure: true,
                        auth: {
                            user,
                            pass
                        },
                        logger: false
                    });

                    client.on('error', (err) => {
                        console.warn('⚠️ ImapFlow delete connection warning:', err.message);
                    });

                    await client.connect();
                    // Open all mail first to locate the message UID
                    await client.mailboxOpen('[Gmail]/All Mail');
                    await client.messageDelete(idOrUid);
                    await client.logout();

                    return res.status(200).json({
                        success: true,
                        message: 'Email successfully deleted directly from your Gmail!'
                    });
                }
            } catch (err) {
                console.warn('⚠️ Gmail direct deletion failed, checking MongoDB fallback:', err.message);
            }
        }

        // 2. Fallback to MongoDB log deletion
        const log = await EmailLog.findById(idOrUid);
        
        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Email record not found'
            });
        }

        // Authorization checks
        if (
            req.user.role !== 'admin' &&
            log.recipient.toLowerCase().trim() !== req.user.email.toLowerCase().trim() &&
            log.senderId?.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this log'
            });
        }

        await EmailLog.findByIdAndDelete(idOrUid);

        res.status(200).json({
            success: true,
            message: 'Email log successfully deleted'
        });
    } catch (error) {
        console.error('Error deleting email log:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete email',
            error: error.message
        });
    }
};

// @desc    Resend a logged email
// @route   POST /api/email-logs/:id/resend
// @access  Private
export const resendEmailLog = async (req, res) => {
    try {
        const logId = req.params.id;

        // If it's a Gmail IMAP message (numeric UID), we can't fetch full raw nodemailer templates
        // but we can query the details and resend, or read details from Gmail and send!
        // To make it seamless, if it's not in MongoDB, we can query it from Gmail, parse it, and send a copy!
        let log = await EmailLog.findById(logId);

        if (!log && /^\d+$/.test(logId)) {
            try {
                let user = process.env.EMAIL_USER;
                let pass = process.env.EMAIL_PASS;

                const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
                if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
                    user = settings.emailConfig.user;
                    pass = settings.emailConfig.pass;
                }

                if (user && pass) {
                    // Fetch details from Gmail to simulate resend
                    const client = new ImapFlow({
                        host: 'imap.gmail.com',
                        port: 993,
                        secure: true,
                        auth: {
                            user,
                            pass
                        },
                        logger: false
                    });

                    client.on('error', (err) => {
                        console.warn('⚠️ ImapFlow resend connection warning:', err.message);
                    });

                    await client.connect();
                    await client.mailboxOpen('[Gmail]/All Mail');
                    const msg = await client.fetchOne(logId, { envelope: true });
                    await client.logout();

                    if (msg && msg.envelope) {
                        // Create transient log template to pass to resendLoggedEmail
                        log = await EmailLog.create({
                            recipient: msg.envelope.to[0] ? `${msg.envelope.to[0].mailbox}@${msg.envelope.to[0].host}` : req.user.email,
                            subject: msg.envelope.subject || 'Resent Gmail Message',
                            contentSnippet: 'Resent direct Gmail communication.',
                            body: `<p>This is a resent copy of email: <strong>${msg.envelope.subject}</strong> originally dispatched on ${msg.envelope.date}.</p>`,
                            type: 'WELCOME',
                            status: 'sent',
                            senderId: req.user._id
                        });
                    }
                }
            } catch (err) {
                console.warn('⚠️ Direct Gmail details fetch for resend failed:', err.message);
            }
        }

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Email log not found for resend operation'
            });
        }

        // Authorization Scoping
        if (
            req.user.role !== 'admin' &&
            log.recipient.toLowerCase().trim() !== req.user.email.toLowerCase().trim() &&
            log.senderId?.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to resend this email'
            });
        }

        const sent = await resendLoggedEmail(log._id);

        if (sent) {
            res.status(200).json({
                success: true,
                message: 'Email successfully resent!'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to resend the email via SMTP'
            });
        }
    } catch (error) {
        console.error('Error resending email log:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during the resending process',
            error: error.message
        });
    }
};
