const bcrypt = require('bcrypt');

// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

class User {
  static async findOne(query) {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .match(query)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    // If we found a user, add the matchPassword method to the plain object
    if (data) {
      data.matchPassword = async function(enteredPassword) {
        // The database stores password as 'password_hash'
        return await bcrypt.compare(enteredPassword, this.password_hash || this.password);
      };
      // Also map some fields for compatibility
      data._id = data.id;
      data.isApproved = data.isapproved;
      data.isAdmin = data.isadmin;
      // Ensure password field points to password_hash for compatibility
      if (data.password_hash && !data.password) {
        data.password = data.password_hash;
      }
    }

    return data;
  }

  static async findById(id, projection = '') {
    let selectFields = '*';
    if (projection === '-password') {
      selectFields = 'id,username,email,role,isadmin,isapproved,googleid,createdat,updatedat';
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select(selectFields)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  static async find(query = {}) {
    let queryBuilder = getSupabase().from('users').select('*');

    if (query._id) {
      queryBuilder = queryBuilder.eq('id', query._id);
    }
    if (query.email) {
      queryBuilder = queryBuilder.eq('email', query.email);
    }
    if (query.username) {
      queryBuilder = queryBuilder.eq('username', query.username);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    return data;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const { data, error } = await getSupabase()
      .from('users')
      .update(update)
      .match(query)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  constructor(data) {
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.isAdmin = data.isAdmin || false;
    this.isApproved = data.isApproved !== undefined ? data.isApproved : true;
    this.googleId = data.googleId;
  }

  async save() {
    // Hash password if it's not already hashed
    if (this.password && !this.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    const { data, error } = await getSupabase()
      .from('users')
      .insert({
        username: this.username,
        email: this.email,
        password_hash: this.password,  // Database column is password_hash
        role: this.role,
        isadmin: this.isAdmin,  // Database column is lowercase
        isapproved: this.isApproved,  // Database column is lowercase
        googleid: this.googleId  // Database column is lowercase
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Method to simulate Mongoose select
  select(fields) {
    if (fields === '-password') {
      const { password, ...userWithoutPassword } = this;
      return userWithoutPassword;
    }
    return this;
  }
}

module.exports = User;