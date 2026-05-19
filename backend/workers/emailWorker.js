/**
 * backend/workers/emailWorker.js
 * 
 * Background Cron Job to automatically synchronize emails from Gmail via IMAP.
 * This runs on a separate asynchronous thread to prevent blocking the main Node.js event loop
 * during page loads. It safely handles errors, connection timeouts, and database upserts.
 */

import cron from 'node-cron';
import EmailLog from '../models/EmailLog.js';
import { cacheClear } from '../controllers/emailLogController.js';
import eventBus, { EVENTS } from '../utils/eventBus.js';

let isSyncing = false;

export const startEmailWorker = () => {
    // Schedule task to run every 10 minutes
    // Cron syntax: "*/10 * * * *"
    cron.schedule('*/10 * * * *', async () => {
        if (isSyncing) {
            console.log(`[${new Date().toISOString()}] ⏳ Email Worker: Previous sync still running, skipping this tick.`);
            return;
        }

        try {
            isSyncing = true;
            console.log(`[${new Date().toISOString()}] 🔄 Email Worker: Starting background IMAP sync...`);

            // Dynamically import the IMAP service to avoid loading it if not needed
            const { fetchGmailMails } = await import('../utils/gmailImapService.js');
            const mails = await fetchGmailMails(20);

            if (!mails || mails.length === 0) {
                console.log(`[${new Date().toISOString()}] ✅ Email Worker: No new emails found.`);
                return;
            }

            let syncedCount = 0;
            for (const mail of mails) {
                // Upsert logic: Avoid duplicating the exact same email
                const exists = await EmailLog.findOne({
                    recipient: mail.to || 'inbox',
                    subject: mail.subject,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Check within last 7 days
                }).select('_id').lean();

                if (!exists) {
                    await EmailLog.create({
                        recipient: mail.to || 'inbox',
                        subject: mail.subject || '(no subject)',
                        type: 'INBOX',
                        sender: mail.from,
                        body: mail.body,
                        contentSnippet: (mail.body || '').substring(0, 200),
                        status: 'sent',
                        source: 'gmail_sync',
                    });
                    syncedCount++;
                }
            }

            if (syncedCount > 0) {
                // Clear the EmailLog controller cache
                cacheClear();
                // Broadcast event to frontend via SSE so UI updates instantly
                eventBus.emit('data_change', { type: EVENTS.EMAIL_LOG_UPDATED });
                console.log(`[${new Date().toISOString()}] ✅ Email Worker: Successfully synced ${syncedCount} new email(s).`);
            } else {
                console.log(`[${new Date().toISOString()}] ✅ Email Worker: Evaluated ${mails.length} emails, 0 new to insert.`);
            }

        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Email Worker Error: Failed to sync IMAP. Reason:`, error.message);
            // We intentionally swallow the error here so the Node process/server doesn't crash!
        } finally {
            isSyncing = false;
        }
    });

    console.log(`[${new Date().toISOString()}] ⏰ Email Worker Initialized (Runs every 10 minutes)`);
};
