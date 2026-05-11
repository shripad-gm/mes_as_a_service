import { Prisma } from '@prisma/client';

class AppError extends Error {
  constructor(
    message,
    statusCode = 400,
    code = 'BAD_REQUEST'
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const notFound = (req, res, next) => {
  next(
    new AppError(
      `Route ${req.originalUrl} not found`,
      404,
      'NOT_FOUND'
    )
  );
};

const errorHandler = (err, req, res, next) => {
  // Prisma known errors
  if (
    err instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';

      return res.status(409).json({
        success: false,
        code: 'DUPLICATE',
        message: `${field} already exists`,
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Record not found',
      });
    }

    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        code: 'FOREIGN_KEY',
        message:
          'Referenced record does not exist',
      });
    }
  }

  if (
    err instanceof Prisma.PrismaClientValidationError
  ) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION',
      message: 'Invalid data provided',
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // Unexpected errors
  console.error('UNHANDLED ERROR:', err);

  res.status(500).json({
    success: false,
    code: 'SERVER_ERROR',
    message: 'Internal server error',
  });
};

export { AppError, notFound, errorHandler };