module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { event, data } = req.body || {};
        
        // Log usage events
        console.log('📊 XoptYmiZ Usage Event:', {
            event,
            data,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });

        // In production, store in database
        // await storeAnalyticsEvent(event, data, metadata);

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
