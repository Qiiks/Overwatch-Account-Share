const EmailService = require('../models/EmailService');
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Newest first; rows lacking createdat sort as epoch — verified: no throw, order preserved when all rows lack it.
const byCreatedAtDesc = (a, b) => new Date(b.createdat || 0) - new Date(a.createdat || 0);

// Per-field error map; partial=true validates only the fields the caller supplied.
const validateFields = ({ email, clientId, clientSecret }, partial = false) => {
  const details = {};
  if ((!partial || email !== undefined) && !EMAIL_RE.test(String(email || '').trim())) {
    details.email = 'Must be a valid email address';
  }
  if ((!partial || clientId !== undefined) && !String(clientId || '').trim()) {
    details.clientId = 'Required';
  }
  if ((!partial || clientSecret !== undefined) && !String(clientSecret || '').trim()) {
    details.clientSecret = 'Required';
  }
  return details;
};

const assertFields = (body, partial = false) => {
  const details = validateFields(body, partial);
  if (Object.keys(details).length) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Invalid email service configuration', details);
  }
};

const findOr404 = async (id) => {
  const emailService = await EmailService.findById(id);
  if (!emailService) {
    throw new ApiError(404, 'NOT_FOUND', 'Email service configuration not found');
  }
  return emailService;
};

// @desc    Add a new email service configuration
// @route   POST /api/email-service
// @access  Private/Admin
const addEmailService = asyncHandler(async (req, res) => {
  const { email, clientId, clientSecret } = req.body;

  assertFields(req.body);

  const address = email.trim();
  const existingService = await EmailService.findOne({ email: address });
  if (existingService) {
    throw new ApiError(409, 'CONFLICT', 'Email service configuration already exists');
  }

  const emailService = await EmailService.create({
    email: address,
    clientId,
    clientSecret
  });

  return ok(res, emailService, 201);
});

// @desc    Get all email service configurations
// @route   GET /api/email-service
// @access  Private/Admin
const getEmailServices = asyncHandler(async (req, res) => {
  const emailServices = await EmailService.find({});

  return ok(res, emailServices.sort(byCreatedAtDesc));
});

// @desc    Update an email service configuration
// @route   PUT /api/email-service/:id
// @access  Private/Admin
const updateEmailService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, clientId, clientSecret, isActive } = req.body;

  const emailService = await findOr404(id);

  assertFields(req.body, true);

  // Check if email is being changed and if it already exists
  const address = email !== undefined ? email.trim() : undefined;
  if (address && address !== emailService.email) {
    const existingService = await EmailService.findOne({ email: address });
    if (existingService) {
      throw new ApiError(409, 'CONFLICT', 'Email service configuration with this email already exists');
    }
  }

  // findOneAndUpdate takes raw column names, like save().
  const update = {};
  if (address !== undefined) update.email = address;
  if (clientId !== undefined) update.clientid = clientId;
  if (clientSecret !== undefined) update.clientsecret = clientSecret;
  if (typeof isActive === 'boolean') update.isactive = isActive;

  if (!Object.keys(update).length) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'No updatable fields provided');
  }

  const updatedEmailService = await EmailService.findOneAndUpdate({ _id: id }, update);

  return ok(res, updatedEmailService);
});

// @desc    Delete an email service configuration
// @route   DELETE /api/email-service/:id
// @access  Private/Admin
const deleteEmailService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await findOr404(id);
  await EmailService.deleteOne({ _id: id });

  return ok(res, { id, deleted: true });
});

// @desc    Toggle active status of an email service
// @route   PATCH /api/email-service/:id/toggle
// @access  Private/Admin
const toggleEmailServiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const emailService = await findOr404(id);
  const updatedEmailService = await EmailService.findOneAndUpdate(
    { _id: id },
    { isactive: !emailService.isactive }
  );

  return ok(res, updatedEmailService);
});

// @desc    Get all active email service configurations for regular users
// @route   GET /api/email/services
// @access  Private
const getActiveEmailServices = asyncHandler(async (req, res) => {
  const emailServices = await EmailService.find({ isActive: true });

  // Non-admin route: the OAuth client secret must not leave the admin surface.
  return ok(
    res,
    emailServices
      .sort(byCreatedAtDesc)
      .map(({ clientsecret, ...service }) => service)
  );
});

module.exports = {
  addEmailService,
  getEmailServices,
  updateEmailService,
  deleteEmailService,
  toggleEmailServiceStatus,
  getActiveEmailServices
};
