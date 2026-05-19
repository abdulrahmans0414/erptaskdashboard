import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import Settings from '../models/Settings.js';

/**
 * Connects directly to Gmail IMAP, fetches emails, parses them, and filters them
 * based on user scopes and custom search parameters.
 * Returns null if credentials are unavailable/invalid.
 */
export const fetchGmailMails = async (userEmail, userRole, queryParams = {}) => {
    const { folder = 'ALL', search = '', limit = 15, page = 1, type } = queryParams;
    const limitNumber = parseInt(limit, 10);
    const pageNumber = parseInt(page, 10);

    // Normalize Gmail folder paths
    let gmailFolder = 'INBOX';
    if (folder === 'SENT') {
        gmailFolder = '[Gmail]/Sent Mail';
    } else if (folder === 'FAILED') {
        gmailFolder = '[Gmail]/Trash';
    } else if (folder === 'ALL' || type) {
        gmailFolder = '[Gmail]/All Mail';
    }

    // Load credentials - strip spaces from app passwords (common copy-paste issue)
    let user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
    let pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : '';

    try {
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings?.emailConfig?.user && settings?.emailConfig?.pass) {
            user = settings.emailConfig.user.trim();
            pass = settings.emailConfig.pass.replace(/\s/g, '');
        }
    } catch (e) {
        console.warn('Failed to load email settings from DB for IMAP, using .env fallback');
    }

    // Require valid credentials before attempting connection
    if (!user || !pass) {
        return null; // Signal to caller: no credentials available
    }

    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false,
        tls: {
            rejectUnauthorized: false
        }
    });

    // CRITICAL: Prevent socket drops from crashing the process
    client.on('error', (err) => {
        console.warn('⚠️ ImapFlow connection warning (non-fatal):', err.message);
    });

    try {
        await client.connect();
    } catch (err) {
        console.warn('⚠️ IMAP connect failed:', err.message);
        return null; // Signal caller to use MongoDB fallback
    }

    let mailbox;
    try {
        mailbox = await client.mailboxOpen(gmailFolder);
    } catch (err) {
        // Fallback to INBOX if special folder path does not exist
        try {
            mailbox = await client.mailboxOpen('INBOX');
        } catch (innerErr) {
            console.warn('⚠️ Cannot open any mailbox:', innerErr.message);
            try { await client.logout(); } catch (_) {}
            return null;
        }
    }

    // Retrieve all matching UIDs from Gmail inbox
    let uids;
    try {
        uids = await client.search(['ALL']);
    } catch (err) {
        console.warn('⚠️ IMAP search failed:', err.message);
        try { await client.logout(); } catch (_) {}
        return null;
    }

    const uidsArray = Array.from(uids || []);

    // Sort UIDs descending so latest emails are first
    uidsArray.sort((a, b) => b - a);

    const mails = [];
    const startIndex = (pageNumber - 1) * limitNumber;

    // Fetch slightly more than needed in a batch to account for in-memory filters
    const paginatedUids = uidsArray.slice(startIndex, startIndex + limitNumber * 3);

    if (paginatedUids.length > 0) {
        try {
            const rangeString = paginatedUids.join(',');
            const fetchStream = client.fetch(rangeString, { source: true, envelope: true });

            const fetchedMessages = [];
            for await (const msg of fetchStream) {
                fetchedMessages.push(msg);
            }

            // Sort messages descending by UID
            fetchedMessages.sort((a, b) => b.uid - a.uid);

            // Process and parse messages in memory
            for (const message of fetchedMessages) {
                if (mails.length >= limitNumber) break;

                if (message?.source) {
                    let parsed;
                    try {
                        parsed = await simpleParser(message.source);
                    } catch (e) {
                        continue; // Skip unparseable messages
                    }

                    const subject = parsed.subject || '';
                    const textContent = parsed.text || '';
                    const htmlContent = parsed.html || parsed.textAsHtml || '';

                    // Determine dynamic category type matching our system
                    let mailType = 'WELCOME';
                    if (/otp|security|verification|password|login/i.test(subject)) {
                        mailType = 'SECURITY';
                    } else if (/task|assign|priority|due|approved|rejected|rework|review/i.test(subject)) {
                        mailType = 'TASKS';
                    }

                    // Category type filter
                    if (type && type !== 'ALL' && mailType !== type) {
                        continue;
                    }

                    // Extract recipient email safely
                    let recipient = '';
                    if (parsed.to?.value?.[0]) {
                        recipient = parsed.to.value[0].address || '';
                    } else if (typeof parsed.to === 'string') {
                        recipient = parsed.to;
                    } else if (message.envelope?.to?.[0]) {
                        const t = message.envelope.to[0];
                        recipient = t.mailbox && t.host ? `${t.mailbox}@${t.host}` : '';
                    }

                    // Extract sender email safely
                    let sender = '';
                    if (parsed.from?.value?.[0]) {
                        sender = parsed.from.value[0].address || '';
                    } else if (message.envelope?.from?.[0]) {
                        const f = message.envelope.from[0];
                        sender = f.mailbox && f.host ? `${f.mailbox}@${f.host}` : '';
                    }

                    // Role-based email matching for non-admins
                    if (userRole !== 'admin' && userEmail) {
                        const emailLower = userEmail.toLowerCase().trim();
                        const matchTo = recipient.toLowerCase().includes(emailLower);
                        const matchFrom = sender.toLowerCase().includes(emailLower);
                        if (!matchTo && !matchFrom) {
                            continue;
                        }
                    }

                    // Keyword search filter
                    if (search.trim()) {
                        const query = search.toLowerCase().trim();
                        const matchSubject = subject.toLowerCase().includes(query);
                        const matchContent = textContent.toLowerCase().includes(query);
                        const matchRecipient = recipient.toLowerCase().includes(query);
                        if (!matchSubject && !matchContent && !matchRecipient) {
                            continue;
                        }
                    }

                    mails.push({
                        _id: message.uid.toString(),
                        recipient: recipient || 'unknown@system.com',
                        sender: sender || user,
                        subject: subject || '(No Subject)',
                        contentSnippet: textContent
                            ? textContent.substring(0, 150).replace(/\s+/g, ' ').trim() + '...'
                            : 'No text body available.',
                        body: htmlContent || textContent || 'No content preview.',
                        type: mailType,
                        status: 'sent',
                        createdAt: parsed.date || message.envelope?.date || new Date(),
                        attachments: (parsed.attachments || []).map((att, idx) => ({
                            filename: att.filename || `attachment_${idx}`,
                            contentType: att.contentType,
                            fileSize: att.size
                        }))
                    });
                }
            }
        } catch (fetchErr) {
            console.warn('⚠️ IMAP fetch error:', fetchErr.message);
        }
    }

    try {
        await client.logout();
    } catch (_) {}

    return {
        mails,
        total: uidsArray.length,
        page: pageNumber,
        pages: Math.ceil(uidsArray.length / limitNumber),
        limit: limitNumber
    };
};
