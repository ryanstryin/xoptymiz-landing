module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { 
            email, 
            company, 
            useCase, 
            source,
            usage_data,
            plan_interest,
            demo_url,
            timestamp 
        } = req.body || {};
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        // Enhanced lead data
        const leadData = {
            email,
            company: company || '',
            use_case: useCase || '',
            source: source || 'landing_page',
            plan_interest: plan_interest || 'not_specified',
            demo_url: demo_url || '',
            usage_data: usage_data || {},
            timestamp: timestamp || new Date().toISOString(),
            lead_score: calculateLeadScore(usage_data, company, useCase)
        };

        // Log enhanced lead data
        console.log('🎯 Enhanced XoptYmiZ Lead:', {
            email,
            source,
            lead_score: leadData.lead_score,
            demo_usage: !!usage_data,
            company: !!company,
            timestamp: leadData.timestamp
        });

        // In production, store in Supabase
        // await storeEnhancedLead(leadData);

        // Send different responses based on lead quality
        const response = {
            success: true,
            message: getPersonalizedMessage(leadData.lead_score, source),
            lead_score: leadData.lead_score,
            next_steps: getNextSteps(leadData.lead_score),
            timestamp: new Date().toISOString()
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Enhanced signup error:', error);
        res.status(500).json({
            error: 'Signup failed',
            message: error.message
        });
    }
};

function calculateLeadScore(usage_data, company, useCase) {
    let score = 50; // Base score
    
    // Demo usage scoring
    if (usage_data) {
        if (usage_data.urls_tested > 1) score += 15;
        if (usage_data.time_spent > 120) score += 10; // 2+ minutes
        if (usage_data.features_used && usage_data.features_used.length > 2) score += 10;
        if (usage_data.llms_downloaded) score += 15;
    }
    
    // Company information
    if (company && company.length > 3) score += 10;
    
    // Use case specified
    if (useCase && useCase.length > 10) score += 10;
    
    return Math.min(score, 100);
}

function getPersonalizedMessage(score, source) {
    if (score >= 80) {
        return 'Thank you for your interest! Based on your demo usage, you\\'re a perfect fit for XoptYmiZ. Expect a personal call within 24 hours to discuss your needs.';
    } else if (score >= 60) {
        return 'Thanks for trying XoptYmiZ! We\\'ll send you exclusive optimization tips and early access to premium features.';
    } else {
        return 'Welcome to XoptYmiZ! Check your email for our getting started guide and optimization best practices.';
    }
}

function getNextSteps(score) {
    if (score >= 80) {
        return [
            'Personal demo call scheduled within 24 hours',
            'Custom optimization analysis for your website',
            'Early access to enterprise features',
            'Dedicated account manager assigned'
        ];
    } else if (score >= 60) {
        return [
            'Exclusive optimization tips via email',
            'Early access to premium features beta',
            'Weekly AI optimization newsletter',
            'Invitation to monthly webinars'
        ];
    } else {
        return [
            'Getting started guide via email',
            'Access to free optimization tools',
            'Monthly newsletter with tips',
            'Community forum access'
        ];
    }
}
