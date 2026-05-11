import { validationResult } from 'express-validator';

import { AppError } from './errorHandler.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((e) => `${e.path}: ${e.msg}`)
      .join(', ');

    return next(
      new AppError(
        messages,
        422,
        'VALIDATION_ERROR'
      )
    );
  }

  next();
};

export { validate };