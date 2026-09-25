const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const maxFileSizeMB = Number(process.env.MAX_FILE_SIZE_MB) || 10;

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const fileFilter = function (req, file, cb) {
    const allowedExtensions = [".pdf", ".txt", ".docx"];

    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, TXT and DOCX files are allowed"));
    }
};

const upload = multer({
    storage: storage,

    limits: {
        fileSize: maxFileSizeMB * 1024 * 1024
    },

    fileFilter: fileFilter
});

module.exports = upload;