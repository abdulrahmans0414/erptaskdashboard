import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import Settings from '../models/Settings.js';

/**
 * Connects directly to Gmail IMAP, fetches emails, parses them, and filters them
 * based on user scopes and custom search parameters.
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

    let user = process.env.EMAIL_USER;
    let pass = process.env.EMAIL_PASS;

    try {
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings && settings.emailConfig && settings.emailConfig.user && settings.emailConfig.pass) {
            user = settings.emailConfig.user;
            pass = settings.emailConfig.pass;
        }
    } catch (e) {
        console.error('Failed to load email settings from DB for IMAP.', e);
    }

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

    // CRITICAL: Prevent socket drops (like ECONNRESET) from raising uncaught exceptions and crashing the process
    client.on('error', (err) => {
        console.warn('⚠️ ImapFlow connection warning (non-fatal):', err.message);
    });

    await client.connect();

    let mailbox;
    try {
        mailbox = await client.mailboxOpen(gmailFolder);
    } catch (err) {
        // Fallback to INBOX if special folder path does not exist
        mailbox = await client.mailboxOpen('INBOX');
    }

    // Retrieve all matching UIDs from Gmail inbox
    let uids = await client.search(['ALL']);
    const uidsArray = Array.from(uids || []);

    // Sort UIDs descending so latest emails are first
    uidsArray.sort((a, b) => b - a);

    const mails = [];
    const startIndex = (pageNumber - 1) * limitNumber;
    
    // Fetch slightly more than needed in a batch to account for in-memory filters
    const paginatedUids = uidsArray.slice(startIndex, startIndex + limitNumber * 2);

    if (paginatedUids.length > 0) {
        // Perform a single batch request to fetch all messages in one round-trip (10x faster!)
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
            if (mails.length >= limitNumber) {
                break;
            }

            if (message && message.source) {
                let parsed;
                try {
                    parsed = await simpleParser(message.source);
                } catch (e) {
                    continue; // Skip parsing errors
                }

                const subject = parsed.subject || '';
                const textContent = parsed.text || '';
                
                // Determine dynamic category type matching our system
                let mailType = 'WELCOME';
                if (/otp|security|verification|password|login/i.test(subject)) {
                    mailType = 'SECURITY';
                } else if (/task|assign|priority|due/i.test(subject)) {
                    mailType = 'TASKS';
                }

                // Category type filter
                if (type && type !== 'ALL' && mailType !== type) {
                    continue;
                }

                // Extract recipient email safely
                let recipient = '';
                if (parsed.to && parsed.to.value && parsed.to.value[0]) {
                    recipient = parsed.to.value[0].address;
                } else if (parsed.to && typeof parsed.to === 'string') {
                    recipient = parsed.to;
                } else if (message.envelope && message.envelope.to && message.envelope.to[0]) {
                    recipient = `${message.envelope.to[0].mailbox}@${message.envelope.to[0].host}`;
                }

                // Extract sender email safely
                let sender = '';
                if (parsed.from && parsed.from.value && parsed.from.value[0]) {
                    sender = parsed.from.value[0].address;
                } else if (message.envelope && message.envelope.from && message.envelope.from[0]) {
                    sender = `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`;
                }

                // Strict security sandboxing: check role-based email matching
                if (userRole !== 'admin' && userEmail) {
                    const emailLower = userEmail.toLowerCase().trim();
                    const matchTo = recipient.toLowerCase().includes(emailLower);
                    const matchFrom = sender.toLowerCase().includes(emailLower);
                    if (!matchTo && !matchFrom) {
                        continue; // Skip emails not belonging to this user
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
                    recipient: recipient || 'unknown@spis.com',
                    sender: sender || user,
                    subject: subject || '(No Subject)',
                    contentSnippet: textContent ? textContent.substring(0, 150).replace(/\s+/g, ' ').trim() + '...' : 'No text body available.',
                    body: parsed.html || parsed.textAsHtml || parsed.text || 'No content preview.',
                    type: mailType,
                    status: 'sent',
                    createdAt: parsed.date || message.envelope.date || new Date(),
                    attachments: (parsed.attachments || []).map((att, idx) => ({
                        filename: att.filename || `attachment_${idx}`,
                        contentType: att.contentType,
                        fileSize: att.size
                    }))
                });
            }
        }
    }

    await client.logout();

    return {
        mails,
        total: uidsArray.length,
        page: pageNumber,
        pages: Math.ceil(uidsArray.length / limitNumber),
        limit: limitNumber
    };
};
