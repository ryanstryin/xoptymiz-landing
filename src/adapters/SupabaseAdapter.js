const { createClient } = require('@supabase/supabase-js');

class SupabaseAdapter {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    async storeBetaSignup(email, metadata = {}) {
        const { data, error } = await this.supabase
            .from('beta_signups')
            .insert([
                {
                    email,
                    metadata,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return data;
    }

    async storeProcessedContent(contentData) {
        const { data, error } = await this.supabase
            .from('processed_content')
            .insert([contentData]);

        if (error) throw error;
        return data;
    }

    async getProcessedContent(domain) {
        const { data, error } = await this.supabase
            .from('processed_content')
            .select('*')
            .eq('domain', domain)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async health() {
        try {
            const { data, error } = await this.supabase
                .from('beta_signups')
                .select('count')
                .limit(1);
            
            return !error;
        } catch (err) {
            return false;
        }
    }
}

module.exports = SupabaseAdapter;