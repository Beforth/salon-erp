const AppError = require('../utils/AppError');

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { fields: errors },
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Replace req data with validated data
    req.body = result.data.body;
    req.query = result.data.query;
    req.params = result.data.params;

    next();
  };
};

module.exports = validate;
