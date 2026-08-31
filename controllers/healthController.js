const healthCheck = (req, res) => {
    res.status(200).json({
        success: true,
        message: "Cortex AI Backend is running"
    });
};

module.exports = {
    healthCheck
};