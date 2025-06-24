module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { urls } = req.body || {};
        
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'URLs array required' });
        }

        if (urls.length > 5) {
            return res.status(400).json({ error: 'Maximum 5 URLs per batch' });
        }

        console.log('🚀 Batch processing', urls.length, 'URLs');

        const results = await Promise.allSettled(
            urls.map(async (url) => {
                const response = await fetch(process.env.VERCEL_URL + '/api/process-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                return response.json();
            })
        );

        const processed = results.map((result, index) => ({
            url: urls[index],
            status: result.status === 'fulfilled' ? 'success' : 'error',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        }));

        res.json({
            success: true,
            processed: processed.filter(r => r.status === 'success').length,
            failed: processed.filter(r => r.status === 'error').length,
            results: processed,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            error: 'Batch processing failed',
            message: error.message
        });
    }
};
