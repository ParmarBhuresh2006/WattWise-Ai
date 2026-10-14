const { validationResult } = require('express-validator');

/**
 * Express middleware that checks for validation errors from express-validator
 * and returns a 400 with a structured errors array if any are found.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;
