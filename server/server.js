const express = require('express');
const cors = require('cors');
const path = require('path');
const abiTasksRouter = require('./routes/abiTasks');

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: CLIENT_ORIGIN === '*' ? CLIENT_ORIGIN : CLIENT_ORIGIN.split(','),
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/abi-tasks', abiTasksRouter);

// Serve uploaded PDFs statically (optional fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Interner Serverfehler',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`[Server] listening on port ${PORT}`);
});

