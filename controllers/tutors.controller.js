// controllers/tutors.controller.js
const svc = require('../services/tutor.service');
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
            return res.status(400).json({error: {message: 'No file uploaded'}});
        }

        const detected = await sniffFileType(file.buffer);
        const okMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (!detected || !okMimes.has(detected.mime)) {
            return res.status(400).json({error: {message: 'Invalid image type'}});
        }
        const ext = detected.ext === 'jpeg' ? 'jpg' : detected.ext;
        const filename = `${crypto.randomUUID()}.${ext}`;
        const folder = `/avatars/${req.user.id}`;

        const uploadResp = await imagekit.upload({
            file: file.buffer,
            fileName: filename,
            folder,
            useUniqueFileName: true,
            isPrivateFile: false,
            tags: ['avatar', String(req.user.id), 'tutor'],
        });

        const publicUrl = uploadResp.url;
        let profile;
        try {
            profile = await svc.updateAvatar(req.user.id, publicUrl);
        } catch (dbErr) {
            try {
                await imagekit.deleteFile(uploadResp.fileId);
            } catch {
            }
            throw dbErr;
        }

        res.json({profile, avatarUrl: publicUrl, message: 'Avatar uploaded successfully'});
    } catch (e) {
        next(e);
    }
}

async function uploadIdDocument(req, res, next) {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(400).json({error: {message: 'No file uploaded'}});
        }

        const detected = await sniffFileType(file.buffer);
        // allow images and PDF for ID docs
        const okMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
        if (!detected || !okMimes.has(detected.mime)) {
            return res.status(400).json({error: {message: 'Invalid file type'}});
        }
        let ext = detected.ext === 'jpeg' ? 'jpg' : detected.ext;
        if (detected.mime === 'application/pdf') ext = 'pdf';
        const filename = `${crypto.randomUUID()}.${ext}`;
        const folder = `/id-documents/${req.user.id}`;

        const uploadResp = await imagekit.upload({
            file: file.buffer,
            fileName: filename,
            folder,
            useUniqueFileName: true,
            isPrivateFile: false, // set true if you want private docs + signed URLs
            tags: ['id-document', String(req.user.id)],
        });

        const publicUrl = uploadResp.url;
        let profile;
        try {
            profile = await svc.updateIdDocument(req.user.id, publicUrl);
        } catch (dbErr) {
            try {
                await imagekit.deleteFile(uploadResp.fileId);
            } catch {
            }
            throw dbErr;
        }

        res.json({profile, idDocumentUrl: publicUrl, message: 'Document uploaded successfully'});
    } catch (e) {
        next(e);
    }
}

module.exports = {
    getMe,
    putMe,
    listAssignedStudents,
    listMyAssignments,
    uploadAvatar,
    uploadIdDocument,
};
