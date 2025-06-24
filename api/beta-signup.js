module.exports = (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { email } = req.body || {};
    
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }
    
    console.log('Beta signup:', email);
    
    res.json({
        success: true,
        message: 'Successfully joined XoptYmiZ beta!',
        email: email
    });
};
