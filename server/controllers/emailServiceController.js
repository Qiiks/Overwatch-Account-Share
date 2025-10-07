const EmailService = require('../models/EmailService');
const asyncHandler = require('express-async-handler');

// @desc    Add a new email service configuration
// @route   POST /api/email-service
// @access  Private/Admin
const addEmailService = asyncHandler(async (req, res) => {
  const { email, clientId, clientSecret } = req.body;

  // Check if email service already exists
  const existingService = await EmailService.findOne({ email });
  if (existingService) {
    res.status(400);
    throw new Error('Email service configuration already exists');
  }

  const emailService = await EmailService.create({
    email,
    clientId,
    clientSecret
  });

  res.status(201).json({
    success: true,
    data: emailService
  });
});

// @desc    Get all email service configurations
// @route   GET /api/email-service
// @access  Private/Admin
const getEmailServices = asyncHandler(async (req, res) => {
  const emailServices = await EmailService.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: emailServices
  });
});

// @desc    Update an email service configuration
// @route   PUT /api/email-service/:id
// @access  Private/Admin
const updateEmailService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, clientId, clientSecret, isActive } = req.body;

  const emailService = await EmailService.findById(id);

  if (!emailService) {
    res.status(404);
    throw new Error('Email service configuration not found');
  }

  // Check if email is being changed and if it already exists
  if (email && email !== emailService.email) {
    const existingService = await EmailService.findOne({ email });
    if (existingService) {
      res.status(400);
      throw new Error('Email service configuration with this email already exists');
    }
  }

  emailService.email = email || emailService.email;
  emailService.clientId = clientId || emailService.clientId;
  emailService.clientSecret = clientSecret || emailService.clientSecret;
  if (typeof isActive === 'boolean') {
    emailService.isActive = isActive;
  }

  const updatedEmailService = await emailService.save();

  res.status(200).json({
    success: true,
    data: updatedEmailService
  });
});

// @desc    Delete an email service configuration
// @route   DELETE /api/email-service/:id
// @access  Private/Admin
const deleteEmailService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const emailService = await EmailService.findById(id);

  if (!emailService) {
    res.status(404);
    throw new Error('Email service configuration not found');
  }

  await emailService.remove();

  res.status(200).json({
    success: true,
    message: 'Email service configuration deleted successfully'
  });
});

// @desc    Toggle active status of an email service
// @route   PATCH /api/email-service/:id/toggle
// @access  Private/Admin
const toggleEmailServiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const emailService = await EmailService.findById(id);

  if (!emailService) {
    res.status(404);
    throw new Error('Email service configuration not found');
  }

  emailService.isActive = !emailService.isActive;
  const updatedEmailService = await emailService.save();

  res.status(200).json({
    success: true,
    data: updatedEmailService
  });
});

// @desc    Get all active email service configurations for regular users
// @route   GET /api/email/services
// @access  Private
const getActiveEmailServices = asyncHandler(async (req, res) => {
  const emailServices = await EmailService.find({ isActive: true }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: emailServices
  });
});

module.exports = {
  addEmailService,
  getEmailServices,
  updateEmailService,
  deleteEmailService,
  toggleEmailServiceStatus,
  getActiveEmailServices
};