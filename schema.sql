-- ==============================================================================
-- TeamTrek Database Schema
-- ==============================================================================
-- Run this file to initialize your PostgreSQL database:
-- psql teamtrek < schema.sql
-- ==============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TEAMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(50),        -- Tailwind gradient classes (e.g., "from-cyan-400 to-blue-500")
    icon VARCHAR(10),             -- Emoji icon
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================================================
-- USERS / PARTICIPANTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    avatar_emoji VARCHAR(10) DEFAULT '🚶',
    slack_user_id VARCHAR(20),    -- For Slack @mentions (format: U0XXXXXXXX)
    raffle_tickets INTEGER DEFAULT 0,
    grand_prize_entry BOOLEAN DEFAULT false,
    banked_steps INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster team lookups
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- ==============================================================================
-- ACTIVITY LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_count INTEGER NOT NULL CHECK (step_count >= 0),
    date_logged DATE NOT NULL,
    activity_type VARCHAR(50) DEFAULT 'Walking',
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate entries for same user/date/activity
    UNIQUE(user_id, date_logged, activity_type)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date_logged);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, date_logged);

-- ==============================================================================
-- DAILY WINNERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS daily_winners (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_count INTEGER NOT NULL,
    announced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_winners_date ON daily_winners(date);
CREATE INDEX IF NOT EXISTS idx_daily_winners_user_id ON daily_winners(user_id);

-- ==============================================================================
-- WEEKLY RAFFLE WINNERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS raffle_winners (
    id SERIAL PRIMARY KEY,
    week_number INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prize_title VARCHAR(100),
    prize_emoji VARCHAR(10),
    total_steps INTEGER,          -- Steps for that week
    drawn_at TIMESTAMP DEFAULT NOW(),
    announced BOOLEAN DEFAULT false,

    -- One winner per week
    UNIQUE(week_number)
);

CREATE INDEX IF NOT EXISTS idx_raffle_winners_week ON raffle_winners(week_number);

-- ==============================================================================
-- GRAND PRIZE ENTRIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS grand_prize_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_steps INTEGER NOT NULL,
    qualified_at TIMESTAMP DEFAULT NOW(),

    -- One entry per user
    UNIQUE(user_id)
);

-- ==============================================================================
-- BADGES EARNED
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMP DEFAULT NOW(),

    -- One badge type per user
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- ==============================================================================
-- CHALLENGE METADATA (Optional - for multi-challenge support)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    daily_goal INTEGER DEFAULT 7000,
    global_goal INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================================================
-- HELPFUL VIEWS
-- ==============================================================================

-- User total steps
CREATE OR REPLACE VIEW user_totals AS
SELECT
    u.id,
    u.username,
    u.team_id,
    u.avatar_emoji,
    COALESCE(SUM(a.step_count), 0) as total_steps
FROM users u
LEFT JOIN activity_logs a ON u.id = a.user_id
GROUP BY u.id, u.username, u.team_id, u.avatar_emoji;

-- Team totals
CREATE OR REPLACE VIEW team_totals AS
SELECT
    t.id,
    t.name,
    t.color_hex,
    t.icon,
    COUNT(DISTINCT u.id) as member_count,
    COALESCE(SUM(a.step_count), 0) as total_steps,
    CASE
        WHEN COUNT(DISTINCT u.id) > 0
        THEN COALESCE(SUM(a.step_count), 0) / COUNT(DISTINCT u.id)
        ELSE 0
    END as avg_steps_per_member
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
LEFT JOIN activity_logs a ON u.id = a.user_id
GROUP BY t.id, t.name, t.color_hex, t.icon;

-- Daily leaderboard
CREATE OR REPLACE VIEW daily_leaderboard AS
SELECT
    a.date_logged,
    u.id as user_id,
    u.username,
    u.avatar_emoji,
    t.name as team_name,
    SUM(a.step_count) as daily_steps
FROM activity_logs a
JOIN users u ON a.user_id = u.id
LEFT JOIN teams t ON u.team_id = t.id
GROUP BY a.date_logged, u.id, u.username, u.avatar_emoji, t.name
ORDER BY a.date_logged DESC, daily_steps DESC;

-- ==============================================================================
-- SAMPLE DATA (Optional - remove in production)
-- ==============================================================================

-- Uncomment to insert sample teams:
-- INSERT INTO teams (name, color_hex, icon) VALUES
--     ('Team Alpha', 'from-cyan-400 to-blue-500', '🚀'),
--     ('Team Beta', 'from-orange-300 to-pink-400', '⚡');

-- Uncomment to insert sample users:
-- INSERT INTO users (username, team_id, avatar_emoji) VALUES
--     ('Alice', 1, '🧘‍♀️'),
--     ('Bob', 1, '🏃‍♂️'),
--     ('Carol', 2, '🤸‍♀️'),
--     ('Dave', 2, '🚴‍♂️');

-- ==============================================================================
-- USEFUL QUERIES (Reference)
-- ==============================================================================

-- Get leaderboard for today:
-- SELECT * FROM daily_leaderboard WHERE date_logged = CURRENT_DATE;

-- Get user's streak (consecutive days hitting goal):
-- WITH daily_totals AS (
--     SELECT user_id, date_logged, SUM(step_count) as daily_steps
--     FROM activity_logs
--     GROUP BY user_id, date_logged
-- )
-- SELECT user_id, COUNT(*) as streak
-- FROM daily_totals
-- WHERE daily_steps >= 7000
-- GROUP BY user_id;

-- Get weekly steps for raffle eligibility:
-- SELECT user_id, SUM(step_count) as weekly_steps
-- FROM activity_logs
-- WHERE date_logged >= DATE_TRUNC('week', CURRENT_DATE)
-- GROUP BY user_id
-- HAVING SUM(step_count) >= 29400;  -- 60% of 49000
