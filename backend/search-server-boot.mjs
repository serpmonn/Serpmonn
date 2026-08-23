process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.AI_SEARCH_PORT = process.env.AI_SEARCH_PORT || '3500';
await import('./search-server.mjs');
