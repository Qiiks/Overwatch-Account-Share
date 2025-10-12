const logger = require('../utils/logger');

// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

class Settings {
  static async findOne(query) {
    let queryBuilder = getSupabase().from('system_settings').select('*');
    
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
      .from('system_settings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }
  
  static async find(query = {}) {
    let queryBuilder = getSupabase().from('system_settings').select('*');
    
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
    let queryBuilder = getSupabase().from('system_settings');
    
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
    let queryBuilder = getSupabase().from('system_settings').delete();
    
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
      .from('system_settings')
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
  
  // Helper method to get a setting by name
  static async getSetting(name) {
    try {
      const setting = await this.findOne({ key: name });
      return setting ? setting.value : null;
    } catch (error) {
      logger.error(`Error getting setting ${name}:`, error);
      return null;
    }
  }
  
  // Helper method to update a setting
  static async updateSetting(name, value) {
    try {
      // Try to update existing setting first
      const existing = await this.findOne({ key: name });
      
      if (existing) {
        // Update existing setting
        const updated = await this.findOneAndUpdate(
          { key: name },
          { value: value }
        );
        return updated;
      } else {
        // Create new setting if it doesn't exist
        const newSetting = await this.upsert(name, value);
        return newSetting;
      }
    } catch (error) {
      logger.error(`Error updating setting ${name}:`, error);
      throw error;
    }
  }
  
  constructor(data) {
    this.key = data.key;
    this.value = data.value;
    this._id = data._id;
  }
  
  async save() {
    const { data, error } = await getSupabase()
      .from('system_settings')
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