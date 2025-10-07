// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

class EmailService {
  static async findOne(query) {
    let queryBuilder = getSupabase().from('email_services').select('*');
    
    if (query.email) {
      queryBuilder = queryBuilder.eq('email', query.email);
    }
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    
    const { data, error } = await queryBuilder.single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data;
  }
  
  static async findById(id) {
    const { data, error } = await getSupabase()
      .from('email_services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }
  
  static async find(query = {}) {
    let queryBuilder = getSupabase().from('email_services').select('*');
    
    if (query.email) {
      queryBuilder = queryBuilder.eq('email', query.email);
    }
    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.eq('isactive', query.isActive);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }
  
  static async findOneAndUpdate(query, update, options = {}) {
    let queryBuilder = getSupabase().from('email_services').update(update);
    
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    if (query.email) {
      queryBuilder = queryBuilder.eq('email', query.email);
    }
    
    const { data, error } = await queryBuilder.select().single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  static async deleteOne(query) {
    let queryBuilder = getSupabase().from('email_services').delete();
    
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    if (query.email) {
      queryBuilder = queryBuilder.eq('email', query.email);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  constructor(data) {
    this.email = data.email;
    this.clientId = data.clientId;
    this.clientSecret = data.clientSecret;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this._id = data._id;
  }
  
  async save() {
    const { data, error } = await getSupabase()
      .from('email_services')
      .insert({
        email: this.email,
        clientid: this.clientId,  // Database column is lowercase
        clientsecret: this.clientSecret,  // Database column is lowercase
        isactive: this.isActive  // Database column is lowercase
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
}

// Helper function for backward compatibility
const findEmailServiceByEmail = async (email) => {
  return await EmailService.findOne({ email });
};

module.exports = EmailService;
module.exports.findEmailServiceByEmail = findEmailServiceByEmail;