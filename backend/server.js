require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Route modules
const authRoutes       = require('./routes/auth');
const groupRoutes      = require('./routes/groups');
const membershipRoutes = require('./routes/membership');
const sessionRoutes    = require('./routes/sessions');
const messageRoutes    = require('./routes/messages');
const adminRoutes      = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3001;

// CORS — restrict to frontend origin in production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(bodyParser.json({ limit: '50kb' })); // cap request body size

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mount routes
app.use('/',               authLimiter, authRoutes);
app.use('/groups',         groupRoutes);
app.use('/group-membership', membershipRoutes);
app.use('/sessions',       sessionRoutes);
app.use('/messages',       messageRoutes);
app.use('/admin',          adminRoutes);

app.listen(port, () => {
  console.log(`BrainHive server running on port ${port}`);
});
