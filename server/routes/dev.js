const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { supabase } = require('../config/db');
const { otpService } = require('../services/otpService');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');

/**
 * Development-only harness: push a fake OTP through the real emit path so socket
 * delivery (owner + shared users only) can be asserted end-to-end without a live
 * Gmail mailbox. Mounted only when NODE_ENV !== 'production' and DEV_TOOLS=true.
 */
router.post('/emit-otp', protect, async (req, res, next) => {
  try {
    const { accountId, otp } = req.body;
    if (!accountId) {
      throw new ApiError(400, 'VALIDATION_FAILED', 'accountId is required');
    }

    const { data: account, error } = await supabase
      .from('overwatch_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      throw new ApiError(404, 'NOT_FOUND', 'Account not found');
    }
    if (account.owner_id !== req.user.id) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the account owner can trigger an OTP push');
    }

    const io = req.app.get('io');
    await otpService.emitOTP(io, account, String(otp || '123456'));

    return ok(res, { emitted: true, accountId: account.id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
