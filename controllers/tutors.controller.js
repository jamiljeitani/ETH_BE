// controllers/tutors.controller.js
const svc = require('../services/tutor.service');
const sessionSvc = require('../services/session.service');
const {imagekit} = require('../lib/imagekit');
const crypto = require('node:crypto');

async function getMe(req, res, next) {
    try {
        const profile = await svc.getMe(req.user.id);
        res.json({profile});
    } catch (e) {
        next(e);
    }
}

async function putMe(req, res, next) {
    try {
        const profile = await svc.upsertMe(req.user.id, req.body);
        res.json({profile, message: 'Tutor profile saved.'});
    } catch (e) {
        next(e);
    }
}

/** Assigned students (unique list) */
async function listAssignedStudents(req, res, next) {
    try {
        const students = await svc.listAssignedStudents(req.user.id);
        res.json({students});
    } catch (e) {
        next(e);
    }
}

/** Assignments (student + purchase) */
async function listMyAssignments(req, res, next) {
    try {
        const assignments = await svc.listAssignmentsDetailed(req.user.id);
        res.json({assignments});
    } catch (e) {
        next(e);
    }
}

// Helper: robust mime sniffing (dynamic import to support CJS)
async function sniffFileType(buffer) {
    try {
        const {fileTypeFromBuffer} = await import('file-type');
        return await fileTypeFromBuffer(buffer);
    } catch {
        return null;
    }
}

async function uploadAvatar(req, res, next) {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(400).json({ error: { message: 'No file uploaded' } });
        }

        // Avatars: accept images only
        const detected = await sniffFileType(file.buffer);
        const okMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (!detected || !okMimes.has(detected.mime)) {
            return res.status(400).json({ error: { message: 'Invalid image type' } });
        }

        const ext = detected.ext === 'jpeg' ? 'jpg' : detected.ext;
        const filename = `${crypto.randomUUID()}.${ext}`;
        const folder = `/avatars/${req.user.id}`;
        const roleTag = (req.user && req.user.role) ? String(req.user.role) : 'user';

        // Upload: return URL only, no DB mutations here
        const uploadResp = await imagekit.upload({
            // Node SDK accepts Buffer; base64 is also fine:
            file: file.buffer, // or: file.buffer.toString('base64')
            fileName: filename,
            folder,
            useUniqueFileName: true,
            isPrivateFile: false,
            tags: ['avatar', String(req.user.id), roleTag],
        });

        const publicUrl = uploadResp.url;

        // IMPORTANT: Do not call any DB update here.
        // The FE will send this URL later via the normal profile update.

        return res.status(201).json({
            avatarUrl: publicUrl,
            fileId: uploadResp.fileId,       // handy if you ever need to delete/replace
            message: 'Avatar uploaded successfully',
        });
    } catch (e) {
        return next(e);
    }
}

async function uploadIdDocument(req, res, next) {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(400).json({ error: { message: 'No file uploaded' } });
        }

        // Allow images + PDF
        const detected = await sniffFileType(file.buffer);
        const mime = detected?.mime || file.mimetype; // fall back to provided mimetype
        const okMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
        if (!mime || !okMimes.has(mime)) {
            return res.status(400).json({ error: { message: 'Unsupported file type' } });
        }

        // Normalize extension
        let ext = detected?.ext || (mime === 'application/pdf' ? 'pdf' : mime.split('/')[1]);
        if (ext === 'jpeg') ext = 'jpg';

        const filename = `${crypto.randomUUID()}.${ext}`;
        const folder = `/id-documents/${req.user.id}`;
        const roleTag = (req.user && req.user.role) ? String(req.user.role) : 'user';

        // Upload to ImageKit: return URL only, no DB write here
        const uploadResp = await imagekit.upload({
            file: file.buffer,              // Buffer is fine; base64 string also works
            fileName: filename,
            folder,
            useUniqueFileName: true,
            isPrivateFile: false,           // set true for sensitive docs + signed URLs flow
            tags: ['id-document', String(req.user.id), roleTag],
        });

        return res.status(201).json({
            idDocumentUrl: uploadResp.url,
            fileId: uploadResp.fileId,
            message: 'Document uploaded successfully',
        });
    } catch (e) {
        return next(e);
    }
}
async function listAssignedPurchases(req, res, next) {
  try {
    const purchases = await sessionSvc.listAssignedPurchases(req.user);
    res.json({ purchases });
  } catch (e) { next(e); }
}

module.exports = {
    getMe,
    putMe,
    listAssignedStudents,
    listMyAssignments,
    uploadAvatar,
    uploadIdDocument,
  listAssignedPurchases,
};
