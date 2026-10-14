const path = require('path');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { testConnection } = require('./config/db');
const authRoutes = require('./src/routes/authRoutes');
const itemRoutes = require('./src/routes/itemRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { requirePageAuth } = require('./src/middlewares/authMiddleware');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 8 }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'src/views/index.html')));
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'src/views/login.html')));
app.get('/report-lost', requirePageAuth('student', 'staff', 'admin'), (_req, res) => res.sendFile(path.join(__dirname, 'src/views/report-lost.html')));
app.get('/admin/dashboard', requirePageAuth('admin', 'staff'), (_req, res) => res.sendFile(path.join(__dirname, 'src/views/admin/dashboard.html')));
app.get('/admin/users', requirePageAuth('admin'), (_req, res) => res.sendFile(path.join(__dirname, 'src/views/admin/users.html')));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image must be 5 MB or smaller.' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Server error.' });
});

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

testConnection()
  .then(() => app.listen(PORT, () => console.log(`Lost & Found server running at http://localhost:${PORT}`)))
  .catch(err => {
    console.error('Could not connect to Supabase. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
    console.error(err.message);
    process.exit(1);
  });
