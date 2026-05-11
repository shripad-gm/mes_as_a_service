import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign a short-lived access token for a given userId.
 * @param {string} userId
 * @returns {string} signed JWT
 */
const generateAccessToken = (userId) =>
  jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

/**
 * Sign a long-lived refresh token for a given userId.
 * @param {string} userId
 * @returns {string} signed JWT
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

/**
 * Verify an access token and return its payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {{ userId: string }}
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_SECRET);

/**
 * Verify a refresh token and return its payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {{ userId: string }}
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET);

/**
 * Return the default refresh-token expiry as a Date object
 * (7 days from now, matching JWT_REFRESH_EXPIRES_IN default).
 * @returns {Date}
 */
const refreshTokenExpiresAt = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshTokenExpiresAt,
};
