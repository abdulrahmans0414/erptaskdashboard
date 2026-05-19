/**
 * uploadMiddleware.js
 * 
 * Cloudinary-based upload middleware.
 * Replaces local multer diskStorage with Cloudinary CDN.
 * Files are stored permanently - survives Render redeploys.
 * 
 * Usage:
 *   router.post('/route', uploadToCloudinary('folder', 5), controller)
 *   req.uploadedFiles = [{ filename, fileUrl, fileSize, mimeType, publicId }]
 */

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import path from 'path';

// ── Configure Cloudinary ────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// ── Allowed file types ──────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
];

const ALLOWED_EXTENSIONS = /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|pptx?|zip)$/i;

// ── Upload buffer to Cloudinary ─────────────────────────────────
const uploadBufferToCloudinary = (buffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
};

// ── Delete file from Cloudinary ─────────────────────────────────
export const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('Cloudinary delete error:', err.message);
    }
};

/**
 * Middleware factory for Cloudinary uploads.
 * @param {string} folder - Cloudinary folder (e.g. 'tasks/forms', 'avatars')
 * @param {number} maxCount - Max number of files (default: 10)
 * @param {string} fieldName - Multer field name (default: 'files')
 * @param {number} maxSizeMB - Max file size in MB (default: 5)
 */
export const uploadToCloudinary = (folder = 'erp/misc', maxCount = 10, fieldName = 'files', maxSizeMB = 5) => {
    // Use memory storage - no disk writes
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const extOk = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
            const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
            if (extOk || mimeOk) return cb(null, true);
            cb(new Error(`Unsupported file type: ${file.originalname}. Allowed: images, PDF, Word, Excel, PowerPoint, ZIP`));
        },
    });

    return [
        // Step 1: Multer puts files in memory
        upload.array(fieldName, maxCount),

        // Step 2: Upload each buffer to Cloudinary
        async (req, res, next) => {
            if (!req.files || req.files.length === 0) {
                req.uploadedFiles = [];
                return next();
            }

            try {
                const uploads = await Promise.all(
                    req.files.map(async (file) => {
                        const ext = path.extname(file.originalname).toLowerCase();
                        const isImage = /\.(png|jpe?g|gif|webp)$/i.test(ext);

                        const result = await uploadBufferToCloudinary(file.buffer, {
                            folder: `erp/${folder}`,
                            resource_type: isImage ? 'image' : 'raw',
                            // Preserve original filename in public_id
                            public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
                            overwrite: false,
                        });

                        return {
                            filename: file.originalname,
                            fileUrl: result.secure_url,   // permanent CDN URL
                            publicId: result.public_id,   // for deletion
                            fileSize: file.size,
                            mimeType: file.mimetype,
                        };
                    })
                );

                req.uploadedFiles = uploads;
                next();
            } catch (err) {
                console.error('Cloudinary upload error:', err.message);
                return res.status(500).json({
                    success: false,
                    message: `File upload failed: ${err.message}`,
                });
            }
        },
    ];
};

/**
 * Single file upload to Cloudinary.
 */
export const uploadSingleToCloudinary = (folder = 'erp/misc', fieldName = 'file', maxSizeMB = 2) => {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const isImage = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
            if (isImage) return cb(null, true);
            cb(new Error('Only image files are allowed (jpg, png, gif, webp)'));
        },
    });

    return [
        upload.single(fieldName),
        async (req, res, next) => {
            if (!req.file) {
                req.uploadedFile = null;
                return next();
            }

            try {
                const result = await uploadBufferToCloudinary(req.file.buffer, {
                    folder: `erp/${folder}`,
                    resource_type: 'image',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                });

                req.uploadedFile = {
                    filename: req.file.originalname,
                    fileUrl: result.secure_url,
                    publicId: result.public_id,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype,
                };
                next();
            } catch (err) {
                console.error('Cloudinary avatar upload error:', err.message);
                return res.status(500).json({
                    success: false,
                    message: `Avatar upload failed: ${err.message}`,
                });
            }
        },
    ];
};

export default cloudinary;
