const Settings = require('../models/Settings');
const { ok } = require('../utils/respond');

/**
 * Admin view of system settings. Deliberately a whitelist: this endpoint is the only place
 * internal settings (e.g. min_jwt_issued_at) are exposed, and only to admins.
 */
const getSettings = async (req, res, next) => {
  try {
    const allowRegistration = await Settings.getSetting('allow_registration');
    const minJwtIssuedAt = await Settings.getSetting('min_jwt_issued_at');

    return ok(res, {
      allow_registration: allowRegistration !== false,
      min_jwt_issued_at: minJwtIssuedAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
};
