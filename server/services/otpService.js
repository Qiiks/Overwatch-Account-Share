const otpService = require('../utils/otpService');
const OverwatchAccount = require('../models/OverwatchAccount');

const startOtpFetching = (io) => {
  console.log('Starting OTP fetching service...');

  setInterval(async () => {
    try {
      // Fetch all accounts that might need an OTP check.
      // This could be refined to only fetch accounts that are "in-use" or expecting an OTP.
      const accounts = await OverwatchAccount.getAllAccounts();

      if (accounts.length > 0) {
        console.log(`Checking for OTPs for ${accounts.length} Overwatch account(s).`);
        for (const account of accounts) {
          await otpService.fetchOTPForAccount(account, io);
        }
      }
    } catch (error) {
      console.error('Error in OTP fetching interval:', error);
    }
  }, 30000); // Check every 30 seconds
};

module.exports = { startOtpFetching };