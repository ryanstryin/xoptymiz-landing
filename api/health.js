module.exports = (req, res) => {
    res.json({
        status: 'healthy',
        service: 'XoptYmiZ',
        timestamp: new Date().toISOString(),
        environment: 'vercel'
    });
};
