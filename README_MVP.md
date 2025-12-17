# ScaleAI SaaS MVP

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-...
SESSION_SECRET=your-random-secret-here
PORT=3000
```

## Run

```bash
npm start
```

Visit: http://localhost:3000

## Features

### Authentication
- Email/password signup: `/signup.html`
- Login: `/login.html`
- Session-based auth with bcrypt password hashing

### Protected Dashboard
- Route: `/dashboard.html`
- Requires authentication (redirects to login if not authenticated)

### AI Business Audit
- Users can describe their education business
- OpenAI generates personalized automation recommendations
- Results are saved to SQLite database
- Audit history viewable per user

### Data Persistence
- SQLite database: `scaleai.db`
- Tables:
  - `users`: id, email, password_hash, created_at
  - `ai_audits`: id, user_id, business_description, current_revenue, ai_response, created_at

## API Endpoints

- `POST /api/signup` - Create account
- `POST /api/login` - Authenticate
- `POST /api/logout` - End session
- `GET /api/me` - Get current user
- `POST /api/audit` - Generate AI audit (protected)
- `GET /api/audits` - Get user's audit history (protected)

## TODO for Production

- [ ] Add password reset flow
- [ ] Implement rate limiting on AI endpoint
- [ ] Add Stripe billing integration
- [ ] Expand AI features (content repurposing, lead scoring, etc.)
- [ ] Add admin panel
- [ ] Deploy with proper HTTPS (set session cookie.secure: true)
- [ ] Add proper logging and error monitoring
- [ ] Set up automated backups for SQLite
