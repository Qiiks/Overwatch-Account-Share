// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

class Settings {
  static async findOne(query) {
    let queryBuilder = getSupabase().from('settings').select('*');
    
    if (query.key) {
      queryBuilder = queryBuilder.eq('key', query.key);
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
      .from('settings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }
  
  static async find(query = {}) {
    let queryBuilder = getSupabase().from('settings').select('*');
    
    if (query.key) {
      queryBuilder = queryBuilder.eq('key', query.key);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }
  
  static async findOneAndUpdate(query, update, options = {}) {
    let queryBuilder = getSupabase().from('settings');
    
    // Prepare the update data
    const updateData = {};
    if (update.value !== undefined) {
      updateData.value = update.value;
    }
    if (update.key !== undefined) {
      updateData.key = update.key;
    }
    
    queryBuilder = queryBuilder.update(updateData);
    
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    if (query.key) {
      queryBuilder = queryBuilder.eq('key', query.key);
    }
    
    const { data, error } = await queryBuilder.select().single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  static async deleteOne(query) {
    let queryBuilder = getSupabase().from('settings').delete();
    
    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    if (query.key) {
      queryBuilder = queryBuilder.eq('key', query.key);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  static async upsert(key, value) {
    const { data, error } = await getSupabase()
      .from('settings')
      .upsert({
        key: key,
        value: value
      }, {
        onConflict: 'key'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  constructor(data) {
    this.key = data.key;
    this.value = data.value;
    this._id = data._id;
  }
  
  async save() {
    const { data, error } = await getSupabase()
      .from('settings')
      .insert({
        key: this.key,
        value: this.value
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
}

module.exports = Settings;