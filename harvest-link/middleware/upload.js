const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeExt = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + safeExt);
    }
});

function imageFilter(req, file, cb) {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    if (!ok) {
        return cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed."));
    }
    cb(null, true);
}

const upload = multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

module.exports = upload;
