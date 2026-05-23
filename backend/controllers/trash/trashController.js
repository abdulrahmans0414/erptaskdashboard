import { v2 as cloudinary } from 'cloudinary';
import Task from '../../models/Task.js';
import User from '../../models/User.js';
import Branch from '../../models/Branch.js';
import logger from '../../logger.js';

// Configure Cloudinary standalone config for guaranteed credential mapping
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Parses and extracts the Cloudinary public ID from a direct CDN URL string.
 * Supports folder hierarchies and handles raw resource structures.
 * 
 * Example URLs handled:
 * - https://res.cloudinary.com/cloud/image/upload/v1234/folder/subfolder/file.jpg => folder/subfolder/file
 * - https://res.cloudinary.com/cloud/raw/upload/v1234/folder/file.pdf => folder/file.pdf
 */
const extractPublicIdFromUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (!url.includes('res.cloudinary.com')) return null;

    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;

        let path = parts[1];
        // Strip out optional version segment prefix (e.g. v172603819/)
        path = path.replace(/^v\d+\//, '');

        const ext = path.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext);

        if (isImage) {
            // Images are destroyed on Cloudinary without the extension segment
            return path.substring(0, path.lastIndexOf('.'));
        } else {
            // Raw files (PDFs, docs, ZIPs) require full extension mapping to destroy
            return path;
        }
    } catch (e) {
        logger.error('❌ Cloudinary URL parsing exception:', e);
        return null;
    }
};

/**
 * Safely triggers uploader.destroy for a given url, catching failures
 * to avoid blockages in DB execution.
 */
const purgeAssetFromCloudinary = async (url) => {
    if (!url) return;
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) return;

    const ext = url.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext);
    const resourceType = isImage ? 'image' : 'raw';

    try {
        logger.info(`🌐 Cloudinary: Requesting deletion of ${resourceType} resource: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        logger.info(`🌐 Cloudinary: Purged asset result: ${JSON.stringify(result)}`);
    } catch (err) {
        logger.error(`❌ Cloudinary: Failed to purge asset: ${publicId} - ${err.message}`);
    }
};

/**
 * Permanently removes a soft-deleted document ('task', 'user', or 'branch') from the database.
 * Executes automated media assets purge from Cloudinary prior to deletion.
 * Enforces strict relational cascade safety checks.
 * 
 * Route: DELETE /api/trash/:type/:id
 */
export const hardDeleteDocument = async (req, res) => {
    const { type, id } = req.params;

    try {
        // Enforce valid type bounds
        if (!['task', 'user', 'branch'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid type constraint. Execution type must be one of: 'task', 'user', or 'branch'."
            });
        }

        let Model;
        if (type === 'task') Model = Task;
        else if (type === 'user') Model = User;
        else if (type === 'branch') Model = Branch;

        // 1. Verify existence & verify it is natively soft-deleted (in the Trash)
        const doc = await Model.findOne({ _id: id });
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: `Target ${type} document not found in system databases.`
            });
        }

        // Security Guard: Enforce soft-delete state compliance
        if (doc.isDeleted !== true) {
            return res.status(403).json({
                success: false,
                message: `Unauthorized hard delete request. Target ${type} is not natively flagged in the Trash.`
            });
        }

        // 2. Enforce Cascade Relational Integrity Guards
        if (type === 'branch') {
            // Query for active users or active tasks still referencing the branch name
            const activeUsersCount = await User.countDocuments({
                branch: doc.name,
                isDeleted: { $ne: true }
            });

            const activeTasksCount = await Task.countDocuments({
                branch: doc.name,
                isDeleted: { $ne: true }
            });

            if (activeUsersCount > 0 || activeTasksCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Relational Cascade Blocked: Cannot permanently delete branch '${doc.name}' because it has active dependencies (${activeUsersCount} non-deleted users and ${activeTasksCount} active tasks still mapped to it).`
                });
            }
        }

        // 3. Automated Asset Parsing & Cloudinary Purge Pipeline
        const assetsToPurge = [];

        if (type === 'task') {
            // Loop attachments array of strings/objects
            if (Array.isArray(doc.attachments)) {
                for (const att of doc.attachments) {
                    if (typeof att === 'string') assetsToPurge.push(att);
                    else if (att && typeof att === 'object' && att.fileUrl) assetsToPurge.push(att.fileUrl);
                }
            }

            // Loop taskFormAttachments
            if (Array.isArray(doc.taskFormAttachments)) {
                for (const att of doc.taskFormAttachments) {
                    if (att.fileUrl) assetsToPurge.push(att.fileUrl);
                }
            }

            // Loop attempts (submissions and feedback attachments)
            if (Array.isArray(doc.attempts)) {
                for (const attempt of doc.attempts) {
                    if (Array.isArray(attempt.submissionAttachments)) {
                        for (const att of attempt.submissionAttachments) {
                            if (att.fileUrl) assetsToPurge.push(att.fileUrl);
                        }
                    }
                    if (Array.isArray(attempt.adminFeedbackAttachments)) {
                        for (const att of attempt.adminFeedbackAttachments) {
                            if (att.fileUrl) assetsToPurge.push(att.fileUrl);
                        }
                    }
                    if (Array.isArray(attempt.comments)) {
                        for (const comment of attempt.comments) {
                            if (Array.isArray(comment.attachments)) {
                                for (const att of comment.attachments) {
                                    if (att.fileUrl) assetsToPurge.push(att.fileUrl);
                                }
                            }
                        }
                    }
                }
            }

            // General comments attachments
            if (Array.isArray(doc.comments)) {
                for (const comment of doc.comments) {
                    if (Array.isArray(comment.attachments)) {
                        for (const att of comment.attachments) {
                            if (att.fileUrl) assetsToPurge.push(att.fileUrl);
                        }
                    }
                }
            }
        } else if (type === 'user') {
            // Purge User avatar string
            if (doc.avatar) {
                assetsToPurge.push(doc.avatar);
            }
            // Purge via avatarPublicId if explicitly set
            if (doc.avatarPublicId) {
                try {
                    logger.info(`🌐 Cloudinary: Purging user avatar by publicId: ${doc.avatarPublicId}`);
                    await cloudinary.uploader.destroy(doc.avatarPublicId, { resource_type: 'image' });
                } catch (err) {
                    logger.error(`❌ Cloudinary: Avatar publicId purge failed: ${err.message}`);
                }
            }
        } else if (type === 'branch') {
            // Purge Branch logo string
            const logoUrl = doc.logo || doc.get?.('logo') || doc.logoUrl;
            if (logoUrl) {
                assetsToPurge.push(logoUrl);
            }
        }

        // Execute asynchronous, concurrent purges wrapped in try/catch mapping
        if (assetsToPurge.length > 0) {
            logger.info(`🧹 Cloudinary: Purging ${assetsToPurge.length} asset(s) concurrently for ${type} ${id}...`);
            await Promise.all(assetsToPurge.map(url => purgeAssetFromCloudinary(url).catch(e => {
                logger.error(`❌ Cloudinary: Concurrent asset purge error on ${url}:`, e);
            })));
        }

        // 4. MongoDB Atomic Execution
        const deletedDoc = await Model.findByIdAndDelete(id);

        logger.info(`🔥 Database: Permanent 'Hard Delete' completed for ${type} ID: ${id}`);

        return res.status(200).json({
            success: true,
            message: `Permanently purged ${type} from database successfully.`,
            data: {
                purgedId: id,
                type: type,
                totalRowsPurged: 1,
                purgedAssetCount: assetsToPurge.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error(`❌ Permanent 'Hard Delete' exception for ${type}/${id}:`, error);
        return res.status(500).json({
            success: false,
            message: `Failed to execute permanent hard delete request: ${error.message}`
        });
    }
};
