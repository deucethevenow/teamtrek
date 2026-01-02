<p align="center">
  <img src="https://img.shields.io/badge/Built%20with-TypeScript-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Slack-Integration-4A154B?style=flat-square&logo=slack" alt="Slack">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
</p>

# TeamTrek

**A gamified team step challenge platform that boosts productivity, builds culture, and gets your team moving.**

Built in a weekend. Ran for a month. Changed how our team worked.

---

## Why TeamTrek?

Stanford research shows walking boosts creative thinking by 60%. We built TeamTrek to test that theory—and discovered that gamifying movement doesn't just make teams healthier, it makes them *sharper*.

Our team walked 2.4 million steps in December. That's 1,093 miles (NYC to Miami). But the real win? Better meetings. More energy. Stronger culture.

---

## Features

- **Real-time Leaderboard** - Individual and team rankings updated instantly
- **AI-Powered Goal Setting** - Smart goals based on team size and historical data
- **Weekly Prize Raffles** - Automatic drawings for participants who hit 60% of weekly goal
- **Achievement Badges** - Earn badges for streaks, milestones, and special activities
- **Slack Integration** - Daily digests, winner announcements, and competitive banter
- **Journey Map** - Visual progress toward collective milestone destinations
- **Bonus Activities** - Award extra "steps" for wellness activities (sleep, hydration, yoga, etc.)
- **Mobile-Friendly** - Responsive design works on any device
- **Gemini AI Tips** - Optional AI-generated health tips and motivation

---

## ⚠️ Security Note

**TeamTrek is designed for trusted internal teams and does not include authentication.**

This means:
- No user accounts or passwords
- Anyone with the URL can view the leaderboard
- Anyone can log steps for any participant
- Data is essentially public within your network

This was intentional—it's a fun, low-friction tool for teams that trust each other. If you need authentication, consider:

| Option | Difficulty | Best For |
|--------|------------|----------|
| Put behind a VPN | Easy | Companies with existing VPN |
| Reverse proxy with basic auth | Easy | Quick password protection |
| Add Slack OAuth | Medium | Slack-first teams |
| Add Google OAuth | Medium | Google Workspace orgs |

**Do not deploy to the public internet without adding authentication.**

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A Slack workspace (optional, for notifications)

### 1. Clone and Install

```bash
git clone https://github.com/deucethevenow/teamtrek.git
cd teamtrek
npm install
```

### 2. Configure Your Challenge

```bash
# Copy the example config
cp config.example.ts config.ts
```

Edit `config.ts` to customize:
- Team names and colors
- Participant names and avatars
- Weekly prizes
- Daily step goals
- Journey milestones

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/teamtrek

# Slack (optional - for notifications)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C0XXXXXXXXX

# Gemini AI (optional - for health tips)
API_KEY=your-gemini-api-key
```

### 4. Initialize Database

```bash
# Create the database
createdb teamtrek

# Run the schema
psql teamtrek < schema.sql
```

### 5. Start the App

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:5173` to see your challenge!

---

## Configuration Guide

### Teams

Edit `config.ts` to define your teams:

```typescript
export const TEAMS: Team[] = [
  {
    id: 1,
    name: "Engineering",
    color_hex: "from-cyan-400 to-blue-500",  // Tailwind gradient
    icon: "🚀"
  },
  {
    id: 2,
    name: "Marketing",
    color_hex: "from-orange-300 to-pink-400",
    icon: "⚡"
  },
];
```

### Participants

Add your team members:

```typescript
export const PARTICIPANTS = [
  {
    id: 1,
    username: "Alice",
    team_id: 1,                    // Must match a team id
    avatar_emoji: "🧘‍♀️",
    slack_user_id: "U0ABC123",     // For @mentions (optional)
    raffle_tickets: 0,
    grand_prize_entry: false,
    banked_steps: 0
  },
  // ... more participants
];
```

### Weekly Prizes

Configure your prize drawings:

```typescript
export const WEEKLY_PRIZES = [
  { week: 1, title: "Fitness Tracker", emoji: "⌚" },
  { week: 2, title: "Massage Gun", emoji: "💆" },
  { week: 3, title: "Yoga Mat Set", emoji: "🧘" },
  { week: 4, title: "Wireless Earbuds", emoji: "🎧" },
];
```

### Goals & Thresholds

```typescript
export const DAILY_GOAL = 7000;              // Steps per day target
export const DAYS_IN_CHALLENGE = 31;          // Challenge duration
export const RAFFLE_THRESHOLD_PCT = 0.6;      // 60% of weekly goal for raffle entry
export const GRAND_PRIZE_THRESHOLD_PCT = 0.7; // 70% of monthly goal for grand prize
```

---

## Slack Integration

TeamTrek posts automated updates to Slack:

- **Morning Motivation** - Daily encouragement with yesterday's winner
- **Daily Winner Announcements** - Celebrate the top stepper
- **Weekly Digests** - Leaderboard summaries and raffle drawings
- **Milestone Celebrations** - When the team hits journey milestones
- **Prize Announcements** - Automated raffle winner reveals

### Slack Setup

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Add Bot Token Scopes: `chat:write`, `reactions:read`, `channels:read`
3. Install to your workspace
4. Copy the Bot Token to your `.env`
5. Invite the bot to your channel: `/invite @TeamTrek`

See [SLACK-INTEGRATION-GUIDE.md](SLACK-INTEGRATION-GUIDE.md) for detailed instructions.

---

## Database Schema

TeamTrek uses PostgreSQL. Key tables:

```sql
-- Teams
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color_hex VARCHAR(50),
  icon VARCHAR(10)
);

-- Users/participants
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  avatar_emoji VARCHAR(10),
  slack_user_id VARCHAR(20),
  raffle_tickets INTEGER DEFAULT 0,
  grand_prize_entry BOOLEAN DEFAULT false
);

-- Activity logs
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  step_count INTEGER NOT NULL,
  date_logged DATE NOT NULL,
  activity_type VARCHAR(50) DEFAULT 'Walking',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily winners
CREATE TABLE daily_winners (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  step_count INTEGER NOT NULL,
  announced BOOLEAN DEFAULT false
);
```

See [schema.sql](schema.sql) for the complete schema.

---

## Deployment

### Google Cloud Run (Recommended)

```bash
gcloud run deploy teamtrek \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=$DATABASE_URL"
```

### Docker

```bash
docker build -t teamtrek .
docker run -p 3000:3000 --env-file .env teamtrek
```

### Heroku

```bash
heroku create your-teamtrek
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | List all participants |
| `/api/leaderboard` | GET | Get current leaderboard |
| `/api/activity` | POST | Log steps/activity |
| `/api/teams` | GET | Get team standings |
| `/api/challenge/stats` | GET | Full challenge statistics |
| `/api/prizes/:week/draw` | POST | Draw weekly raffle winner |
| `/api/prizes/:week/announce` | POST | Announce winner to Slack |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS, Lucide Icons |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL |
| AI | Google Gemini (optional) |
| Notifications | Slack Bot API |
| Build | Vite |
| Deployment | Docker, Google Cloud Run |

---

## Project Structure

```
teamtrek/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard view
│   ├── Leaderboard.tsx  # Rankings display
│   ├── JourneyMap.tsx   # Progress visualization
│   └── ...
├── services/            # Backend services
│   ├── slackService.ts  # Slack API integration
│   ├── geminiService.ts # AI health tips
│   └── dataService.ts   # Database operations
├── server.ts            # Express API server
├── App.tsx              # React app root
├── config.example.ts    # Configuration template
├── constants.ts         # App constants
├── types.ts             # TypeScript types
└── schema.sql           # Database schema
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built during a weekend hackathon
- Inspired by wanting to make our team healthier AND more productive
- [Stanford research](https://news.stanford.edu/stories/2014/04/walking-vs-sitting-042414): Walking boosts creative thinking by 60%

---

<p align="center">
  <strong>Built with ❤️ and 2.4 million steps</strong>
</p>
