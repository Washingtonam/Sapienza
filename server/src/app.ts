import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import academicRoutes from './routes/academics.js';
import recordRoutes from './routes/records.js';
import financeRoutes from './routes/finance.js';
import cbtRoutes from './routes/cbt.js';
import contentRoutes from './routes/content.js';
import operationsRoutes from './routes/operations.js';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/cbt', cbtRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/operations', operationsRoutes);
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error && error.name === 'ZodError') { response.status(400).json({ error: 'Invalid request data' }); return; }
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});
