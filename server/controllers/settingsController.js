const Settings = require('../models/Settings');
const logger = require('../utils/logger');

// Get public settings (accessible to all users)
const getPublicSettings = async (req, res) => {
  try {
    // Get the allow_registration setting
    const allowRegistration = await Settings.getSetting('allow_registration');
    
    // Return the setting value, default to true if not set
    res.status(200).json({
      success: true,
      data: {
        allow_registration: allowRegistration !== null ? allowRegistration : true
      }
    });
  } catch (error) {
    logger.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

// Update registration setting (admin only)
const updateRegistrationSetting = async (req, res) => {
  try {
    const { allow_registration } = req.body;
    
    // Validate the input
    if (typeof allow_registration !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'allow_registration must be a boolean value'
      });
    }
    
    // Update the setting using the Settings model
    const updatedSetting = await Settings.updateSetting('allow_registration', allow_registration);
    
    res.status(200).json({
      success: true,
      data: {
        key: 'allow_registration',
        value: updatedSetting.value
      },
      message: `Registration has been ${allow_registration ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    logger.error('Error updating registration setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update registration setting'
    });
  }
};

module.exports = {
  getPublicSettings,
  updateRegistrationSetting
};