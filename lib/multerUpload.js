const multer = require("multer");

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const allowed = (mime) => {
    return mime.startsWith("image/") || mime === "application/pdf";
};

const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
        if (!allowed(file.mimetype)) {
            return cb(new Error("Unsupported file type"));
        }
        cb(null, true);
    },
});

module.exports = { uploadMemory };
