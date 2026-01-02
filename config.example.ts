/**
 * TeamTrek Configuration
 *
 * Copy this file to `config.ts` and customize for your organization.
 * This file controls all customizable aspects of your step challenge.
 */

import { Team, Badge, DailyQuest } from './types';

// =============================================================================
// CHALLENGE SETTINGS
// =============================================================================

/** Your company/challenge name (displayed in UI) */
export const APP_NAME = "Your Company";

/** Daily step goal per person */
export const DAILY_GOAL = 7000;

/** Number of days in your challenge */
export const DAYS_IN_CHALLENGE = 31;

/** Number of participants (used for global goal calculation) */
export const PARTICIPANT_COUNT = 10;

// Calculated goals (usually don't need to change these)
export const GLOBAL_GOAL = PARTICIPANT_COUNT * DAILY_GOAL * DAYS_IN_CHALLENGE;
export const INDIVIDUAL_MONTHLY_GOAL = DAILY_GOAL * DAYS_IN_CHALLENGE;

// =============================================================================
// WEEKLY RAFFLE SETTINGS
// =============================================================================

/** Weekly step goal (daily * 7) */
export const WEEKLY_GOAL = DAILY_GOAL * 7;

/** Percentage of weekly goal required to enter raffle (0.6 = 60%) */
export const RAFFLE_THRESHOLD_PCT = 0.6;

export const RAFFLE_THRESHOLD_STEPS = WEEKLY_GOAL * RAFFLE_THRESHOLD_PCT;

// =============================================================================
// GRAND PRIZE SETTINGS
// =============================================================================

/** Percentage of monthly goal required for grand prize entry (0.7 = 70%) */
export const GRAND_PRIZE_THRESHOLD_PCT = 0.7;

export const GRAND_PRIZE_THRESHOLD_STEPS = INDIVIDUAL_MONTHLY_GOAL * GRAND_PRIZE_THRESHOLD_PCT;

// =============================================================================
// TEAMS
// =============================================================================

/**
 * Define your teams here.
 * - id: Unique number for each team
 * - name: Team display name
 * - color_hex: Tailwind gradient classes for team color
 * - icon: Emoji icon for the team
 */
export const TEAMS: Team[] = [
  {
    id: 1,
    name: "Team Alpha",
    color_hex: "from-cyan-400 to-blue-500",
    icon: "🚀"
  },
  {
    id: 2,
    name: "Team Beta",
    color_hex: "from-orange-300 to-pink-400",
    icon: "⚡"
  },
  // Add more teams as needed:
  // { id: 3, name: "Team Gamma", color_hex: "from-green-400 to-teal-500", icon: "🌿" },
];

// =============================================================================
// PARTICIPANTS
// =============================================================================

/**
 * Define your participants here.
 * - id: Unique number for each user
 * - username: Display name
 * - team_id: Must match a team id from TEAMS above
 * - avatar_emoji: Emoji avatar for the user
 * - slack_user_id: (Optional) Slack user ID for mentions (format: U0XXXXXXXX)
 *
 * Leave raffle_tickets, grand_prize_entry, and banked_steps as defaults.
 */
export const PARTICIPANTS = [
  // Team 1
  {
    id: 1,
    username: "Alice",
    team_id: 1,
    avatar_emoji: "🧘‍♀️",
    slack_user_id: "", // Add Slack ID for @mentions
    raffle_tickets: 0,
    grand_prize_entry: false,
    banked_steps: 0
  },
  {
    id: 2,
    username: "Bob",
    team_id: 1,
    avatar_emoji: "🏃‍♂️",
    slack_user_id: "",
    raffle_tickets: 0,
    grand_prize_entry: false,
    banked_steps: 0
  },

  // Team 2
  {
    id: 3,
    username: "Carol",
    team_id: 2,
    avatar_emoji: "🤸‍♀️",
    slack_user_id: "",
    raffle_tickets: 0,
    grand_prize_entry: false,
    banked_steps: 0
  },
  {
    id: 4,
    username: "Dave",
    team_id: 2,
    avatar_emoji: "🚴‍♂️",
    slack_user_id: "",
    raffle_tickets: 0,
    grand_prize_entry: false,
    banked_steps: 0
  },
];

// =============================================================================
// WEEKLY PRIZES
// =============================================================================

/**
 * Define prizes for each week's raffle drawing.
 * Winners are randomly selected from participants who hit 60% of weekly goal.
 */
export const WEEKLY_PRIZES = [
  { week: 1, title: "Fitness Tracker", emoji: "⌚", description: "Week 1 Prize" },
  { week: 2, title: "Massage Gun", emoji: "💆", description: "Week 2 Prize" },
  { week: 3, title: "Yoga Mat Set", emoji: "🧘", description: "Week 3 Prize" },
  { week: 4, title: "Wireless Earbuds", emoji: "🎧", description: "Week 4 Prize" },
];

/** Grand prize for end of challenge */
export const GRAND_PRIZE = {
  title: "Weekend Getaway",
  emoji: "🏖️",
  description: "All-expenses-paid weekend trip"
};

// =============================================================================
// JOURNEY MILESTONES
// =============================================================================

/**
 * Collective step milestones displayed on the journey map.
 * First milestone should be 0 (starting point).
 */
export const MILESTONES = [
  { steps: 0, label: "Starting Point (HQ)" },
  { steps: 500000, label: "Blue Lagoon, Iceland" },
  { steps: 1000000, label: "Kyoto Bamboo Forest" },
  { steps: 1500000, label: "Machu Picchu" },
  { steps: 2000000, label: "Great Barrier Reef" },
  { steps: 2500000, label: "The Moon! 🌙" },
];

// =============================================================================
// BONUS ACTIVITIES
// =============================================================================

/**
 * Bonus activities that award extra "steps" for wellness activities.
 * Users can log these in addition to actual steps.
 */
export const BONUS_ACTIVITIES = [
  {
    type: 'Bonus: Lifting',
    label: 'Lift / Weights',
    steps: 1500,
    description: 'Strength training session',
    icon: 'Dumbbell'
  },
  {
    type: 'Bonus: Sleep',
    label: '8h Sleep',
    steps: 500,
    description: 'Got 8+ hours of quality sleep',
    icon: 'Moon'
  },
  {
    type: 'Bonus: Hydration',
    label: 'Hydration',
    steps: 300,
    description: 'Drank 8+ glasses of water',
    icon: 'Droplets'
  },
  {
    type: 'Bonus: Stretch',
    label: 'Yoga / Stretch',
    steps: 750,
    description: 'Yoga or stretching session',
    icon: 'Move'
  },
  // Add your own bonus activities!
];

// =============================================================================
// BADGES
// =============================================================================

/**
 * Achievement badges users can earn.
 */
export const BADGES: Badge[] = [
  { id: 'streak_3', label: 'On Fire', icon: '🔥', description: 'Hit goal 3 days in a row', earned: false },
  { id: 'early_bird', label: 'Early Bird', icon: '🌅', description: 'Logged steps before 8am', earned: false },
  { id: 'weekend', label: 'Weekend Warrior', icon: '🎉', description: 'Active on Saturday/Sunday', earned: false },
  { id: 'high_stepper', label: 'High Stepper', icon: '🚀', description: '15k steps in one day', earned: false },
  { id: 'daily_winner', label: 'Daily Champion', icon: '👑', description: 'Most steps in a single day', earned: false },
];

// =============================================================================
// DAILY QUESTS
// =============================================================================

/**
 * Rotating daily challenges for extra engagement.
 */
export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', label: 'The Lunch Lap', description: 'Log activity between 12pm and 2pm', icon: '🥪', targetValue: 2000 },
  { id: 'q2', label: 'Sunrise Stroll', description: 'Log activity before 9am', icon: '🌅', targetValue: 1000 },
  { id: 'q3', label: 'Power Hour', description: 'Log a single walk over 3,000 steps', icon: '⚡', targetValue: 3000 },
  { id: 'q4', label: 'Weekend Warrior', description: 'Log activity on Sat or Sun', icon: '🎉', targetValue: 5000 },
];

// =============================================================================
// CONVERSION RATES (usually don't need to change)
// =============================================================================

export const CONVERSION_RATES = {
  STEPS_PER_MILE: 2222,
  STEPS_PER_MINUTE: 100,
  CALORIES_PER_STEP: 0.05,
  MINUTES_PER_STEP: 0.01
};
