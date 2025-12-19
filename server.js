// Only load .env in development (Vercel injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { sql } = require('@vercel/postgres');
const OpenAI = require('openai');
const path = require('path');

const app = express();

// Lazy-load OpenAI client (initialize when needed, not at module load)
let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Initialize database tables (run once, or use separate migration script)
async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ai_audits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        business_description TEXT NOT NULL,
        current_revenue TEXT,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ Database tables initialized');
  } catch (error) {
    // Tables might already exist, that's okay
    if (!error.message.includes('already exists')) {
      console.error('Database initialization error:', error);
    }
  }
}

// Call on startup
initDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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

    const result = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id
    `;

    const userId = result.rows[0].id;
    req.session.userId = userId;
    res.json({ success: true, userId });
  } catch (error) {
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${email}
    `;

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await sql`
      SELECT id, email, created_at
      FROM users
      WHERE id = ${req.session.userId}
    `;

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Business Audit endpoint
app.post('/api/audit', requireAuth, async (req, res) => {
  const { businessDescription, currentRevenue } = req.body;

  if (!businessDescription) {
    return res.status(400).json({ error: 'Business description required' });
  }

  try {
    const openai = getOpenAI(); // Initialize OpenAI client when needed
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
    const result = await sql`
      INSERT INTO ai_audits (user_id, business_description, current_revenue, ai_response)
      VALUES (${req.session.userId}, ${businessDescription}, ${currentRevenue || null}, ${aiResponse})
      RETURNING id
    `;

    res.json({
      success: true,
      audit: aiResponse,
      auditId: result.rows[0].id
    });
  } catch (error) {
    console.error('AI Audit error:', error);
    res.status(500).json({ error: 'Failed to generate audit' });
  }
});

// Get user's audit history
app.get('/api/audits', requireAuth, async (req, res) => {
  try {
    const result = await sql`
      SELECT id, business_description, current_revenue, ai_response, created_at
      FROM ai_audits
      WHERE user_id = ${req.session.userId}
      ORDER BY created_at DESC
    `;

    res.json(result.rows);
  } catch (error) {
    console.error('Get audits error:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// Publish audit to GitHub
app.post('/api/publish-audit', requireAuth, async (req, res) => {
  const { auditId, auditContent } = req.body;

  if (!auditId || !auditContent) {
    return res.status(400).json({ error: 'Audit ID and content required' });
  }

  try {
    const { execSync } = require('child_process');
    const fs = require('fs');

    // Get user info for the commit
    const userResult = await sql`
      SELECT email FROM users WHERE id = ${req.session.userId}
    `;

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Create audits directory if it doesn't exist
    if (!fs.existsSync('audits')) {
      fs.mkdirSync('audits');
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audits/audit-${auditId}-${timestamp}.md`;

    // Write audit to file
    const fileContent = `# AI Business Audit #${auditId}
Generated: ${new Date().toLocaleString()}
User: ${user.email}

---

${auditContent}

---

*Generated by ScaleAI Systems - AI Business Automation Platform*
`;

    fs.writeFileSync(filename, fileContent);

    // Git operations
    try {
      execSync('git add ' + filename, { cwd: __dirname });
      execSync(`git commit -m "Add AI audit #${auditId} for ${user.email}"`, { cwd: __dirname });
      execSync('git push origin main', { cwd: __dirname });

      res.json({
        success: true,
        message: 'Audit published to GitHub',
        filename: filename
      });
    } catch (gitError) {
      // If git push fails, still save the file but notify user
      res.json({
        success: true,
        message: 'Audit saved locally (GitHub push may have failed)',
        filename: filename
      });
    }
  } catch (error) {
    console.error('Publish audit error:', error);
    res.status(500).json({ error: 'Failed to publish audit' });
  }
});

// Serve dashboard (protected)
app.get('/dashboard.html', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Export for Vercel serverless functions
module.exports = app;

// Only listen when running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`ScaleAI MVP running on http://localhost:${PORT}`);
    console.log(`Database: PostgreSQL (Vercel Postgres)`);
  });
}
