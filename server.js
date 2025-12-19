// server.js

// Only load .env in development (Vercel injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const OpenAI = require('openai');
const path = require('path');

const { prisma } = require('./prismaClient');

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

// NOTE: database schema is now managed by Prisma (prisma/schema.prisma)
// Run `npx prisma db push` once to create tables.

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

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

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash
      },
      select: {
        id: true
      }
    });

    req.session.userId = user.id;
    res.json({ success: true, userId: user.id });
  } catch (error) {
    if (
      error.code === 'P2002' || // Prisma unique constraint
      (error.message &&
        (error.message.includes('duplicate key') ||
          error.message.includes('unique constraint')))
    ) {
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
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

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
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(user);
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
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI business consultant for education businesses. Provide a concise 3-paragraph audit identifying automation opportunities, time savings, and ROI projections.'
        },
        {
          role: 'user',
          content: `Business: ${businessDescription}\nCurrent Revenue: ${
            currentRevenue || 'Not specified'
          }\n\nProvide a business automation audit.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = completion.choices[0].message.content;

    const audit = await prisma.aiAudit.create({
      data: {
        userId: req.session.userId,
        businessDescription,
        currentRevenue: currentRevenue || null,
        aiResponse
      },
      select: {
        id: true
      }
    });

    res.json({
      success: true,
      audit: aiResponse,
      auditId: audit.id
    });
  } catch (error) {
    console.error('AI Audit error:', error);
    res.status(500).json({ error: 'Failed to generate audit' });
  }
});

// Get user's audit history
app.get('/api/audits', requireAuth, async (req, res) => {
  try {
    const audits = await prisma.aiAudit.findMany({
      where: {
        userId: req.session.userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        businessDescription: true,
        currentRevenue: true,
        aiResponse: true,
        createdAt: true
      }
    });

    res.json(audits);
  } catch (error) {
    console.error('Get audits error:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// (Optional) Publish audit to GitHub – left as-is except for DB lookup
app.post('/api/publish-audit', requireAuth, async (req, res) => {
  const { auditId, auditContent } = req.body;

  if (!auditId || !auditContent) {
    return res
      .status(400)
      .json({ error: 'Audit ID and content required' });
  }

  try {
    const { execSync } = require('child_process');
    const fs = require('fs');

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!fs.existsSync('audits')) {
      fs.mkdirSync('audits');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audits/audit-${auditId}-${timestamp}.md`;

    const fileContent = `# AI Business Audit #${auditId}
Generated: ${new Date().toLocaleString()}
User: ${user.email}

---

${auditContent}

---

*Generated by ScaleAI Systems - AI Business Automation Platform*
`;

    fs.writeFileSync(filename, fileContent);

    try {
      execSync('git add ' + filename, { cwd: __dirname });
      execSync(`git commit -m "Add AI audit #${auditId} for ${user.email}"`, {
        cwd: __dirname
      });
      execSync('git push origin main', { cwd: __dirname });

      res.json({
        success: true,
        message: 'Audit published to GitHub',
        filename: filename
      });
    } catch (gitError) {
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
    console.log(`Database: PostgreSQL via Prisma`);
  });
}
