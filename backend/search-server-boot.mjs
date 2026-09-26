process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.AI_SEARCH_PORT = '3501';
await import('./search-server.mjs');
