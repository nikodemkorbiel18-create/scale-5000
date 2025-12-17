require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const db = new Database('scaleai.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    business_description TEXT NOT NULL,
    current_revenue TEXT,
    ai_response TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true with HTTPS in production
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Routes
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    const result = stmt.run(email, passwordHash);

    req.session.userId = result.lastInsertRowid;
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ success: true, userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
  const user = stmt.get(req.session.userId);
  res.json(user);
});

// AI Business Audit endpoint
app.post('/api/audit', requireAuth, async (req, res) => {
  const { businessDescription, currentRevenue } = req.body;

  if (!businessDescription) {
    return res.status(400).json({ error: 'Business description required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'You are an AI business consultant for education businesses. Provide a concise 3-paragraph audit identifying automation opportunities, time savings, and ROI projections.'
      }, {
        role: 'user',
        content: `Business: ${businessDescription}\nCurrent Revenue: ${currentRevenue || 'Not specified'}\n\nProvide a business automation audit.`
      }],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = completion.choices[0].message.content;

    // Save to database
    const stmt = db.prepare('INSERT INTO ai_audits (user_id, business_description, current_revenue, ai_response) VALUES (?, ?, ?, ?)');
    const result = stmt.run(req.session.userId, businessDescription, currentRevenue || null, aiResponse);

    res.json({
      success: true,
      audit: aiResponse,
      auditId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('AI Audit error:', error);
    res.status(500).json({ error: 'Failed to generate audit' });
  }
});

// Get user's audit history
app.get('/api/audits', requireAuth, (req, res) => {
  const stmt = db.prepare('SELECT id, business_description, current_revenue, ai_response, created_at FROM ai_audits WHERE user_id = ? ORDER BY created_at DESC');
  const audits = stmt.all(req.session.userId);
  res.json(audits);
});

// Serve dashboard (protected)
app.get('/dashboard.html', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ScaleAI MVP running on http://localhost:${PORT}`);
});
