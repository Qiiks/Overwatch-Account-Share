#!/usr/bin/env node
/**
 * Idempotent development seed: one owner, one shared user, one account, one share.
 *
 *   ALLOW_DEV_SEED=1 node scripts/seed-dev.js
 *
 * Additive only — it never deletes or modifies rows it did not create, so it is safe
 * against a project that already holds real data. It always re-creates its own dev
 * users' passwords so the E2E suite has a known credential.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const { supabase } = require('../config/db');
const { createOverwatchAccount } = require('../models/OverwatchAccount');

const OWNER = { username: 'DevOwner', email: 'dev-owner@example.com', password: 'DevPassw0rd!' };
const SHARED = { username: 'DevShared', email: 'dev-shared@example.com', password: 'DevPassw0rd!' };
const ACCOUNT = {
  accountTag: 'DevOwner#1234',
  accountEmail: 'dev-owner@example.com',
  accountPassword: "p'a&<b>#1",
};

const upsertUser = async ({ username, email, password }) => {
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, isapproved: true })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      email,
      password_hash: passwordHash,
      role: 'user',
      isadmin: false,
      isapproved: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

const run = async () => {
  if (process.env.ALLOW_DEV_SEED !== '1') {
    console.error('Refusing to run: set ALLOW_DEV_SEED=1 to seed development rows.');
    process.exit(1);
  }

  const ownerId = await upsertUser(OWNER);
  const sharedId = await upsertUser(SHARED);
  console.log(`users ready: ${OWNER.email}, ${SHARED.email}`);

  const { data: existingAccount, error: accountLookupError } = await supabase
    .from('overwatch_accounts')
    .select('id, owner_id')
    .eq('owner_id', ownerId)
    .limit(50);
  if (accountLookupError) throw accountLookupError;

  let accountId = (existingAccount || []).find((row) => row.id)?.id;

  if (!accountId) {
    const created = await createOverwatchAccount({
      accountTag: ACCOUNT.accountTag,
      accountEmail: ACCOUNT.accountEmail,
      accountPassword: ACCOUNT.accountPassword,
      owner_id: ownerId,
      rank: 'Masters',
      mainheroes: ['Tracer', 'Ana'],
    });
    accountId = created.id;
    console.log(`account created: ${accountId}`);
  } else {
    console.log(`account already present: ${accountId}`);
  }

  const { error: shareError } = await supabase
    .from('overwatch_account_allowed_users')
    .upsert(
      { overwatch_account_id: accountId, user_id: sharedId },
      { onConflict: 'overwatch_account_id,user_id' },
    );
  if (shareError) throw shareError;

  console.log('\nDev credentials:');
  console.log(`  owner : ${OWNER.email} / ${OWNER.password}`);
  console.log(`  shared: ${SHARED.email} / ${SHARED.password}`);
  console.log(`  account: ${ACCOUNT.accountTag} (password contains ' & < > #)`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
