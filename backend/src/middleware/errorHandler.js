const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error(`${err.statusCode} - ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    error = new AppError(`Duplicate value for ${field}`, 409, 'DUPLICATE_RESOURCE');
  }

  if (err.code === 'P2025') {
    error = new AppError('Record not found', 404, 'NOT_FOUND');
  }

  // JWT errors are handled in auth middleware

  // Development vs Production response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
        stack: err.stack,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Production: don't leak error details
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Programming or unknown errors: don't leak details
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = errorHandler;
