import { generateKeys } from 'paseto-ts/v4';

// Генерация ключа в формате PASERK
const localKey = generateKeys('local');
console.log('Generated PASERK local key:', localKey);

// Или, если нужно в формате Uint8Array
const localKeyBuffer = generateKeys('local', { format: 'buffer' });
console.log('Generated local key in buffer format:', localKeyBuffer);
