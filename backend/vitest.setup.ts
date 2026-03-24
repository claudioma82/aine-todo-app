// Set required environment variables before any module is imported
process.env.DATABASE_PATH = ':memory:';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.PORT = '3000';
