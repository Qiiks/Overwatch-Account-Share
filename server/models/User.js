const bcrypt = require('bcrypt');
const { logger } = require('../utils/logger');

// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

class User {
  static async findOne(query) {
    try {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .match(query)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        logger.error('Database error in User.findOne:', error);
        throw error;
      }

      // If we found a user, add the matchPassword method to the plain object
      if (data) {
        // Ensure password field is properly set from password_hash
        if (data.password_hash) {
          data.password = data.password_hash;
        }
        
        // Add the matchPassword method with proper error handling
        data.matchPassword = async function(enteredPassword) {
          try {
            // The database stores password as 'password_hash'
            const hashedPassword = this.password_hash || this.password;
            if (!hashedPassword) {
              logger.error('No password hash found for user:', this.email);
              return false;
            }
            return await bcrypt.compare(enteredPassword, hashedPassword);
          } catch (err) {
            logger.error('Error comparing passwords:', err);
            return false;
          }
        };
        
        // Map fields for compatibility
        data._id = data.id;
        data.isApproved = data.isapproved !== undefined ? data.isapproved : true;
        data.isAdmin = data.isadmin || false;
      }

      return data;
    } catch (err) {
      logger.error('Critical error in User.findOne:', err);
      throw err;
    }
  }

  static async findById(id, projection = '') {
    let selectFields = '*';
    if (projection === '-password') {
      // `googleid` is deliberately not selected: nothing reads it (toPublic exposes
      // id/username/email/role/isAdmin/isApproved), and the live project's users table predates
      // the column — selecting it made every GET /api/auth/me answer 42703.
      selectFields = 'id,username,email,role,isadmin,isapproved,createdat,updatedat';
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

  /**
   * Public projection of a user row — the single allowlist every response that
   * returns a user goes through. Never includes the password hash.
   */
  static toPublic(user) {
    if (!user) return null;
    const isAdmin = !!(user.isadmin !== undefined ? user.isadmin : user.isAdmin);
    const isApproved =
      user.isapproved !== undefined
        ? user.isapproved
        : user.isApproved !== undefined
          ? user.isApproved
          : true;
    return {
      id: user.id || user._id,
      username: user.username,
      email: user.email,
      role: isAdmin ? 'admin' : user.role || 'user',
      isAdmin,
      isApproved,
    };
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