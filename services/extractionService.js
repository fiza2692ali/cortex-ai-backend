const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(filePath, fileType) {
    if (fileType === "pdf") {
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);

        return {
            text: data.text,
            pageCount: data.numpages || 0
        };
    }

    if (fileType === "docx") {
        const result = await mammoth.extractRawText({
            path: filePath
        });

        return {
            text: result.value,
            pageCount: 0
        };
    }

    if (fileType === "txt") {
        const text = await fs.readFile(filePath, "utf8");

        return {
            text,
            pageCount: 0
        };
    }

    throw new Error("Unsupported file type.");
}

module.exports = {
    extractText
};