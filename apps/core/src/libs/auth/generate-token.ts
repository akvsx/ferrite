import { randomBytes } from 'node:crypto';

const TOKEN_LENGTH = 32;

export const generateToken = () => randomBytes(TOKEN_LENGTH).toString('hex');
