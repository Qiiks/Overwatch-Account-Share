#!/usr/bin/env node
/**
 * Report-only audit for credentials corrupted by HTML-escaping before encryption.
 *
 * The old write path ran express-validator `.escape()` on battletags and passwords
 * before AES encryption, so any value containing & < > ' " was stored entity-encoded
 * and decrypts wrong forever. This script never writes: it lists affected rows so the
 * owner can decide what to re-enter (the original plaintext is unrecoverable).
 *
 *   node scripts/audit-escaped-credentials.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { supabase } = require('../config/db');
const { decrypt } = require('../utils/encryption');

const ENTITIES = ['&amp;', '&lt;', '&gt;', '&quot;', '&#x27;', '&#39;', '&apos;'];
const looksEscaped = (value) =>
  typeof value === 'string' && ENTITIES.some((entity) => value.includes(entity));

const run = async () => {
  const { data: accounts, error } = await supabase
    .from('overwatch_accounts')
    .select('id, accounttag, accountemail, accountpassword, password_encryption_type, owner_id');

  if (error) throw error;

  const hits = [];
  for (const account of accounts || []) {
    const fields = {};
    for (const field of ['accounttag', 'accountpassword']) {
      const raw = account[field];
      if (!raw) continue;
      let plaintext = raw;
      try {
        plaintext = decrypt(raw);
      } catch (error) {
        fields[field] = `UNDECRYPTABLE (${account.password_encryption_type || 'unknown'})`;
        continue;
      }
      if (looksEscaped(plaintext)) fields[field] = plaintext;
    }
    if (Object.keys(fields).length > 0) {
      hits.push({ id: account.id, email: account.accountemail, fields });
    }
  }

  console.log(`Scanned ${(accounts || []).length} accounts.`);
  if (hits.length === 0) {
    console.log('No escaped credentials found.');
  } else {
    console.log(`${hits.length} account(s) contain HTML-entity text:`);
    for (const hit of hits) {
      console.log(`- ${hit.id} (${hit.email})`);
      for (const [field, value] of Object.entries(hit.fields)) {
        console.log(`    ${field}: ${value}`);
      }
    }
    console.log('\nRepair is manual: the original plaintext cannot be recovered from an escaped value.');
  }
  process.exit(0);
};

run().catch((error) => {
  console.error('Audit failed:', error.message);
  process.exit(1);
});
