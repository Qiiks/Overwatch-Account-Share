// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

class UserGoogleAccount {
  static async findByUserId(userId) {
    if (!userId) return [];
    return this.find({ userId });
  }

  static async upsert(data) {
    const supabase = getSupabase();
    const payload = {
      user_id: data.user_id || data.userId,
      email: data.google_email || data.email,
      display_name: data.display_name,
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      token_expiry: data.token_expiry ? new Date(data.token_expiry) : null,
      scopes: Array.isArray(data.scopes) ? data.scopes : (typeof data.scopes === 'string' ? data.scopes.split(' ') : null),
      is_primary: data.is_primary ?? false,
      is_active: data.is_active ?? true,
      last_used: data.last_used ?? null,
      last_otp_fetch: data.last_otp_fetch ?? null,
      otp_fetch_count: data.otp_fetch_count ?? 0
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const existing = await this.findOne({ userId: payload.user_id, googleEmail: payload.email });

    if (existing) {
      const { data: updated, error } = await supabase
        .from('user_google_accounts')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updated;
    }

    const { data: inserted, error } = await supabase
      .from('user_google_accounts')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return inserted;
  }

  static async deleteById(id, userId) {
    if (!id) {
      throw new Error('Google account id is required');
    }

    let queryBuilder = getSupabase()
      .from('user_google_accounts')
      .delete()
      .eq('id', id);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    const { error } = await queryBuilder;

    if (error) {
      throw error;
    }

    return true;
  }

  static async findOne(query) {
    let queryBuilder = getSupabase().from('user_google_accounts').select('*');
    
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId);
    }
    if (query.googleEmail) {
      queryBuilder = queryBuilder.eq('email', query.googleEmail);
    }
    if (query.isPrimary) {
      queryBuilder = queryBuilder.eq('is_primary', query.isPrimary);
    }
    
    const { data, error } = await queryBuilder.single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data;
  }
  
  static async find(query = {}) {
    let queryBuilder = getSupabase().from('user_google_accounts').select('*');
    
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId);
    }
    if (query.googleEmail) {
      queryBuilder = queryBuilder.eq('email', query.googleEmail);
    }
    if (query.isPrimary !== undefined) {
      queryBuilder = queryBuilder.eq('is_primary', query.isPrimary);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }
  
  static async updateMany(query, update) {
    let queryBuilder = getSupabase().from('user_google_accounts').update(update);
    
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId);
    }
    if (query._id && query._id.$ne) {
      queryBuilder = queryBuilder.neq('id', query._id.$ne);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  static async findById(id) {
    const { data, error } = await getSupabase()
      .from('user_google_accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data;
  }
  
  static async findOneAndUpdate(query, update, options = {}) {
    let queryBuilder = getSupabase().from('user_google_accounts').update(update);
    
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId);
    }
    if (query.googleEmail) {
      queryBuilder = queryBuilder.eq('email', query.googleEmail);
    }
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    
    const { data, error } = await queryBuilder.select().single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  static async deleteOne(query) {
    let queryBuilder = getSupabase().from('user_google_accounts').delete();
    
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId);
    }
    if (query.googleEmail) {
      queryBuilder = queryBuilder.eq('email', query.googleEmail);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  constructor(data) {
    this.userId = data.userId;
    this.googleEmail = data.googleEmail;
    this.accountName = data.accountName;
    this.refreshToken = data.refreshToken;
    this.isPrimary = data.isPrimary || false;
    this._id = data._id;
  }
  
  async save() {
    // If this is being set as primary, unset other primary accounts for this user
    if (this.isPrimary && !this._id) {
      await UserGoogleAccount.updateMany(
        { userId: this.userId },
        { is_primary: false }
      );
    }
    
    const { data, error } = await getSupabase()
      .from('user_google_accounts')
      .insert({
        user_id: this.userId,
        email: this.googleEmail,
        account_name: this.accountName,
        refresh_token: this.refreshToken,
        is_primary: this.isPrimary
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
}

module.exports = UserGoogleAccount;