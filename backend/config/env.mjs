import dotenv from 'dotenv';

// Centralized environment configuration loader
// Allows overriding dotenv path via ENV_FILE_PATH or DOTENV_PATH
const explicitEnvPath = process.env.ENV_FILE_PATH || process.env.DOTENV_PATH;

if (explicitEnvPath) {
  dotenv.config({ path: explicitEnvPath });
} else {
  dotenv.config();
}

export const isProduction = process.env.NODE_ENV === 'production';

export function getEnv(name, fallback) {
  const value = process.env[name];
  return value !== undefined ? value : fallback;
}

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

