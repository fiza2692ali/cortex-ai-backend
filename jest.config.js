module.exports = {
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    testMatch: ["**/tests/**/*.test.js"],
    clearMocks: true
};