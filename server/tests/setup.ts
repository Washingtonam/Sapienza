process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/sapienza-test';
process.env.JWT_SECRET ??= 'test-only-jwt-secret-that-is-at-least-32-characters';
process.env.PAYMENT_WEBHOOK_SECRET ??= 'test-only-webhook-secret-that-is-32-chars';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
