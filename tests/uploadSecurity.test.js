const express = require("express");
const request = require("supertest");
const fs = require("fs/promises");

const upload = require("../middleware/uploadMiddleware");

const app = express();

app.post("/test-upload", upload.single("file"), async (req, res) => {
    if (req.file) {
        await fs.unlink(req.file.path);
    }

    res.status(200).json({
        success: true,
        message: "File accepted"
    });
});

app.use((error, req, res, next) => {
    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            success: false,
            message: "File size limit exceeded"
        });
    }

    res.status(400).json({
        success: false,
        message: error.message
    });
});

describe("Upload Security", () => {

    const maxMB = Number(process.env.MAX_FILE_SIZE_MB) || 10;
    const maxBytes = maxMB * 1024 * 1024;

    test("Accepts a valid TXT file", async () => {
        const response = await request(app)
            .post("/test-upload")
            .attach(
                "file",
                Buffer.from("This is a valid document."),
                "document.txt"
            );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test("Rejects unsupported file extensions", async () => {
        const response = await request(app)
            .post("/test-upload")
            .attach(
                "file",
                Buffer.from("Test content"),
                "malicious.exe"
            );

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(
            /Only PDF, TXT and DOCX files are allowed/
        );
    });

    test("Rejects a file exceeding the size limit", async () => {
        const oversizedFile = Buffer.alloc(maxBytes + 1, "A");

        const response = await request(app)
            .post("/test-upload")
            .attach(
                "file",
                oversizedFile,
                "large-document.txt"
            );

        expect(response.statusCode).toBe(413);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(
            "File size limit exceeded"
        );
    });

});
