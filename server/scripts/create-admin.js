#!/usr/bin/env node
/**
 * Create (or promote) the first admin account.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run setup-admin
 *
 * Optional: ADMIN_USERNAME (default "admin").
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const { supabase } = require('../config/db');

const run = async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash, isadmin: true, isapproved: true, role: 'admin' })
      .eq('id', existing.id);
    if (error) throw error;
    console.log(`Updated existing admin: ${email}`);
  } else {
    const { error } = await supabase.from('users').insert({
      username,
      email,
      password_hash: hash,
      role: 'admin',
      isadmin: true,
      isapproved: true,
    });
    if (error) throw error;
    console.log(`Created admin: ${email}`);
  }

  process.exit(0);
};

run().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
