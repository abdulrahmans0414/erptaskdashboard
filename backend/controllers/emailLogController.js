/**
 * emailLogController.js
 * 
 * Fast, reliable email log management using MongoDB as single source of truth.
 * NO IMAP calls on page load — those were causing 5-30 second delays.
 * All emails sent by the system are already logged to MongoDB via emailService.js.
 * 
 * Features:
 *  - In-memory cache with 2-minute TTL (avoids hammering MongoDB on every SSE reload)
 *  - Full CRUD: list, get, delete, bulk-delete, resend
 *  - Optional manual IMAP sync (triggered by user, not auto-loaded)
 *  - Stats aggregation (cached separately)
 */

import EmailLog from '../models/EmailLog.js';
import { resendLoggedEmail } from '../utils/emailService.js';

// ─── In-Memory Cache ────────────────────────────────────────────────────────
// Simple TTL cache to avoid repeated DB queries on rapid page refreshes.
// Cleared on any write operation (delete, resend, new email sent).
const _cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const cacheGet = (key) => {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
        _cache.delete(key);
        return null;
    }
    return entry.data;
};

const cacheSet = (key, data) => _cache.set(key, { data, ts: Date.now() });

export const cacheClear = () => _cache.clear();

// ─── GET EMAIL LOGS ─────────────────────────────────────────────────────────
export const getEmailLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            status,
            search,
            startDate,
            endDate,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Build cache key from query params
        const cacheKey = `logs:${JSON.stringify(req.query)}`;
        const cached = cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Build MongoDB query
        const query = {};
        if (type && type !== 'all') query.type = type;
        if (status && status !== 'all') query.status = status;
        if (search) {
            query.$or = [
                { recipient: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { contentSnippet: { $regex: search, $options: 'i' } },
            ];
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Run count and data queries in parallel
        const [logs, total] = await Promise.all([
            EmailLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            EmailLog.countDocuments(query),
        ]);

        const response = {
            success: true,
            data: logs,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum),
                limit: limitNum,
            },
        };

        cacheSet(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('getEmailLogs error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET SINGLE EMAIL LOG ───────────────────────────────────────────────────
export const getEmailLogById = async (req, res) => {
    try {
        const log = await EmailLog.findById(req.params.id).lean();
        if (!log) {
            return res.status(404).json({ success: false, message: 'Email log not found' });
        }
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET STATS ──────────────────────────────────────────────────────────────
export const getEmailStats = async (req, res) => {
    try {
        const cached = cacheGet('stats');
        if (cached) return res.json(cached);

        const [total, sent, failed, byType] = await Promise.all([
            EmailLog.countDocuments(),
            EmailLog.countDocuments({ status: 'sent' }),
            EmailLog.countDocuments({ status: 'failed' }),
            EmailLog.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        const response = {
            success: true,
            data: {
                total,
                sent,
                failed,
                successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
                byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
            },
        };

        cacheSet('stats', response);
        res.json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE SINGLE LOG ──────────────────────────────────────────────────────
export const deleteEmailLog = async (req, res) => {
    try {
        const log = await EmailLog.findByIdAndDelete(req.params.id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Email log not found' });
        }
        cacheClear(); // Invalidate all caches after write
        res.json({ success: true, message: 'Email log deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── BULK DELETE ────────────────────────────────────────────────────────────
export const bulkDeleteEmailLogs = async (req, res) => {
    try {
        const { ids, filter } = req.body;

        let result;
        if (ids && Array.isArray(ids) && ids.length > 0) {
            // Delete specific IDs
            result = await EmailLog.deleteMany({ _id: { $in: ids } });
        } else if (filter) {
            // Delete by filter (e.g. all failed, all older than X days)
            const query = {};
            if (filter.status) query.status = filter.status;
            if (filter.type) query.type = filter.type;
            if (filter.olderThanDays) {
                query.createdAt = {
                    $lt: new Date(Date.now() - filter.olderThanDays * 24 * 60 * 60 * 1000),
                };
            }
            if (Object.keys(query).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Provide specific IDs or a filter (status, type, olderThanDays)',
                });
            }
            result = await EmailLog.deleteMany(query);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Provide ids array or filter object',
            });
        }

        cacheClear();
        res.json({
            success: true,
            message: `${result.deletedCount} email log(s) deleted`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── RESEND EMAIL ───────────────────────────────────────────────────────────
export const resendEmail = async (req, res) => {
    try {
        const sent = await resendLoggedEmail(req.params.id);
        cacheClear();
        if (sent) {
            res.json({ success: true, message: 'Email resent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to resend email' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── MANUAL GMAIL IMAP SYNC (Optional, user-triggered) ─────────────────────
// Called only when user clicks "Sync from Gmail" button.
// NOT called on page load.
export const syncFromGmail = async (req, res) => {
    try {
        const { fetchGmailMails } = await import('../utils/gmailImapService.js');
        const mails = await fetchGmailMails(20);

        if (!mails || mails.length === 0) {
            return res.json({
                success: true,
                message: 'No new emails found in Gmail inbox (IMAP may be unavailable or inbox is empty)',
                synced: 0,
            });
        }

        // Upsert by subject+recipient (avoid duplicates)
        let synced = 0;
        for (const mail of mails) {
            const exists = await EmailLog.findOne({
                recipient: mail.to || 'inbox',
                subject: mail.subject,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }).select('_id');

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
                synced++;
            }
        }

        cacheClear();
        res.json({
            success: true,
            message: `Synced ${synced} new email(s) from Gmail`,
            synced,
        });
    } catch (error) {
        console.error('Gmail sync error:', error.message);
        res.status(500).json({
            success: false,
            message: `Gmail sync failed: ${error.message}. Check IMAP credentials.`,
        });
    }
};
