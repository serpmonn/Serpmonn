process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.AGENTS_PORT = process.env.AGENTS_PORT || '3510';
await import('./agents-server.mjs');
