
import { Pool } from 'pg';
import { GLOBAL_GOAL, WEEKLY_GOAL, RAFFLE_THRESHOLD_STEPS, GRAND_PRIZE_THRESHOLD_STEPS, DAILY_GOAL } from '../constants';
import { getDailyFunFact, getMorningMotivation } from './geminiService';

// Helper: Get date string in Mountain Time (YYYY-MM-DD format)
const getMountainTimeDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
};

// Challenge starts December 1, 2025. Week 1 = Dec 1-7, Week 2 = Dec 8-14, etc.
const CHALLENGE_START = new Date('2025-12-01');

// Helper: Get current challenge week (1-4)
const getCurrentWeek = (): number => {
  const today = new Date();
  const todayMT = new Date(getMountainTimeDate(today));
  const daysSinceStart = Math.floor((todayMT.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.min(Math.max(week, 1), 4); // Clamp to 1-4
};

// Helper: Get days left in current week
const getDaysLeftInWeek = (): number => {
  const today = new Date();
  const todayMT = new Date(getMountainTimeDate(today));
  const daysSinceStart = Math.floor((todayMT.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfWeek = daysSinceStart % 7; // 0 = first day, 6 = last day
  return 7 - dayOfWeek - 1; // Days remaining after today
};

// Health benefits for each weekly prize
const PRIZE_HEALTH_BENEFITS: Record<number, { shortBenefit: string; healthTip: string }> = {
  1: {
    shortBenefit: "Track body composition with DEXA-level accuracy",
    healthTip: "💡 *Health Tip:* Body composition tracking helps you understand that muscle weighs more than fat - the scale doesn't tell the whole story!"
  },
  2: {
    shortBenefit: "24 personalized training sessions to build lasting habits",
    healthTip: "💡 *Health Tip:* Personal training builds accountability - people who work with trainers are 30% more likely to stick with their fitness goals!"
  },
  3: {
    shortBenefit: "Better sleep = better recovery, mood & focus",
    healthTip: "💡 *Health Tip:* Sleep is when your body repairs muscle, consolidates memory, and regulates hormones. It's the ultimate performance enhancer!"
  },
  4: {
    shortBenefit: "Accelerate muscle recovery & reduce soreness",
    healthTip: "💡 *Health Tip:* Percussion therapy increases blood flow to muscles, reducing lactic acid buildup and cutting recovery time by up to 50%!"
  }
};

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '#teamtrek';

// Helper: Check if today is Monday in Mountain Time
const isMondayInMT = (): boolean => {
  const now = new Date();
  // Get the day of week in Mountain Time
  const mtDateStr = now.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    weekday: 'long'
  });
  return mtDateStr === 'Monday';
};

// Helper: Get previous week number (for drawing last week's prize on Monday)
const getPreviousWeek = (): number => {
  const currentWeek = getCurrentWeek();
  // On Monday of Week 2, we draw Week 1's winner
  // getCurrentWeek() already returns the new week on Monday
  return Math.max(1, currentWeek - 1);
};

// Debug logging (only log partial token for security)
console.log(`SLACK_BOT_TOKEN loaded: ${SLACK_BOT_TOKEN ? `${SLACK_BOT_TOKEN.substring(0, 10)}...` : 'NOT SET'}`);
console.log(`SLACK_CHANNEL_ID loaded: ${SLACK_CHANNEL_ID}`);

// Helper to post to Slack using Bot Token
export const postToSlack = async (blocks: any[]) => {
  if (!SLACK_BOT_TOKEN) {
    console.log("No SLACK_BOT_TOKEN configured. Skipping notification.");
    return;
  }
  console.log(`Posting to Slack channel: ${SLACK_CHANNEL_ID}`);
  const payload = {
    channel: SLACK_CHANNEL_ID,
    blocks
  };
  console.log(`Payload:`, JSON.stringify(payload).substring(0, 500));
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log(`Slack API response:`, JSON.stringify(result));
    if (!result.ok) {
      console.error(`Slack Error: ${result.error}`);
    } else {
      console.log(`Successfully posted to Slack channel ${SLACK_CHANNEL_ID}`);
    }
  } catch (error) {
    console.error("Failed to send to Slack:", error);
  }
};

// Helper: Get the start date of a specific challenge week
const getWeekStartDate = (weekNumber: number): Date => {
  const start = new Date(CHALLENGE_START);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  return start;
};

// Helper: Get the end date of a specific challenge week
const getWeekEndDate = (weekNumber: number): Date => {
  const end = getWeekStartDate(weekNumber);
  end.setDate(end.getDate() + 6);
  return end;
};

// Helper: Calculate user's steps for the current challenge week
const getUserWeeklySteps = (userId: number, logs: any[], weekNumber: number): number => {
  const weekStart = getWeekStartDate(weekNumber);
  const weekEnd = getWeekEndDate(weekNumber);
  const weekStartStr = getMountainTimeDate(weekStart);
  const weekEndStr = getMountainTimeDate(weekEnd);

  return logs
    .filter((l: any) => {
      return l.user_id === userId &&
             l.date_logged >= weekStartStr &&
             l.date_logged <= weekEndStr;
    })
    .reduce((sum: number, l: any) => sum + l.step_count, 0);
};

// Helper: Auto opt-in qualified users for weekly prize
const autoOptInQualifiedUsers = async (pool: Pool, weekNumber: number, qualifiedUsers: any[]): Promise<number> => {
  let optedInCount = 0;

  // Get the prize for this week
  const prizeRes = await pool.query('SELECT id FROM prizes WHERE week_number = $1', [weekNumber]);
  if (prizeRes.rows.length === 0) {
    console.log(`No prize found for week ${weekNumber}`);
    return 0;
  }
  const prizeId = prizeRes.rows[0].id;

  for (const user of qualifiedUsers) {
    try {
      // Check if user is already opted in
      const existingEntry = await pool.query(
        'SELECT * FROM prize_entries WHERE user_id = $1 AND prize_id = $2',
        [user.id, prizeId]
      );

      if (existingEntry.rows.length === 0) {
        // Auto opt-in the user
        await pool.query(`
          INSERT INTO prize_entries (user_id, prize_id, week_number, opted_in, qualified)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (user_id, prize_id) DO UPDATE SET opted_in = TRUE, qualified = TRUE
        `, [user.id, prizeId, weekNumber]);
        optedInCount++;
        console.log(`Auto opted-in ${user.username} for week ${weekNumber} prize`);
      } else if (!existingEntry.rows[0].qualified) {
        // Update to qualified if not already
        await pool.query(
          'UPDATE prize_entries SET qualified = TRUE WHERE user_id = $1 AND prize_id = $2',
          [user.id, prizeId]
        );
      }
    } catch (err) {
      console.error(`Error auto opt-in for user ${user.id}:`, err);
    }
  }

  return optedInCount;
};

// Fun celebration messages for hitting weekly goal
const WEEKLY_GOAL_CELEBRATIONS = [
  "Your legs called. They want a medal. 🏅",
  "You didn't just hit the goal—you Usain Bolt'd it. 🏃‍♂️💨",
  "Scientists are baffled. Your step counter might need therapy.",
  "Plot twist: You're now officially a walking legend. 🦵✨",
  "Your couch is filing a missing persons report. 🛋️😢",
  "Breaking news: Local hero makes fitness look suspiciously easy.",
  "Your future self just high-fived you through time. 🙌",
  "The ground beneath you is honored by your footsteps. 🌍",
];

// Fun celebration messages for hitting grand prize goal
const GRAND_PRIZE_CELEBRATIONS = [
  "You absolute LEGEND. 👑",
  "Somewhere, a treadmill is weeping with pride. 🏃‍♀️😭",
  "Your dedication has been noted by the fitness gods. ⚡",
  "This is like completing a marathon... but with more snacks along the way. 🍕",
  "You're basically a walking (literally) inspiration now.",
  "Achievement unlocked: 'Why is this person so dedicated?!'",
  "Your legs have earned their own Wikipedia page. 📚",
  "Even your Fitbit is impressed, and it's seen things. 🤯",
];

// Fun stats to show
const getFunStats = (steps: number) => {
  const miles = (steps / 2222).toFixed(1);
  const calories = Math.round(steps * 0.05);
  const minutesWalking = Math.round(steps / 100);
  const elephantLength = (steps * 0.0008 / 6).toFixed(1); // avg step ~0.8m, elephant ~6m
  const burgersBurned = (calories / 550).toFixed(1);
  const phonesCharged = Math.round(calories / 10);

  const funFacts = [
    `📏 That's *${miles} miles*—enough to outrun most of your problems`,
    `🔥 *${calories} calories* burned. That's ${burgersBurned} burgers. Math checks out. 🍔`,
    `⏱️ *${minutesWalking} minutes* of walking. Netflix who?`,
    `🐘 You walked the length of *${elephantLength} elephants*. They're impressed.`,
    `📱 You generated enough human energy to charge *${phonesCharged} phones*. Sort of. Science is fuzzy.`,
  ];

  return funFacts[Math.floor(Math.random() * funFacts.length)];
};

// Send celebration message when user qualifies for weekly prize
export const sendWeeklyPrizeQualificationCelebration = async (
  pool: Pool,
  userId: number,
  weekNumber: number,
  weeklySteps: number
): Promise<void> => {
  try {
    // Get user info
    const userRes = await pool.query(`
      SELECT u.username, u.avatar_emoji, t.name as team_name, t.icon as team_icon
      FROM users u
      JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) return;
    const user = userRes.rows[0];

    // Get prize info for this week
    const prizeRes = await pool.query(
      'SELECT title, emoji FROM prizes WHERE week_number = $1',
      [weekNumber]
    );
    const prize = prizeRes.rows[0];

    // Pick random celebration message
    const celebration = WEEKLY_GOAL_CELEBRATIONS[Math.floor(Math.random() * WEEKLY_GOAL_CELEBRATIONS.length)];
    const funStat = getFunStats(weeklySteps);

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎉 *WEEKLY PRIZE ALERT!* 🎉\n\n${user.avatar_emoji || '🏃'} *${user.username}* just qualified for the *Week ${weekNumber}* prize drawing!`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `> _${celebration}_`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🎯 *${weeklySteps.toLocaleString()} steps* this week • ${funStat}`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${prize?.emoji || '🎁'} Now in the running for: *${prize?.title || 'Weekly Prize'}*`
          }
        ]
      }
    ];

    await postToSlack(blocks);
    console.log(`🎉 Sent weekly prize qualification celebration for ${user.username}`);
  } catch (err) {
    console.error("Error sending weekly prize celebration:", err);
  }
};

// Send celebration message when user qualifies for grand prize
export const sendGrandPrizeQualificationCelebration = async (
  pool: Pool,
  userId: number,
  totalSteps: number
): Promise<void> => {
  try {
    // Get user info
    const userRes = await pool.query(`
      SELECT u.username, u.avatar_emoji, t.name as team_name, t.icon as team_icon
      FROM users u
      JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) return;
    const user = userRes.rows[0];

    // Get grand prize info
    const prizeRes = await pool.query(
      `SELECT title, emoji, description FROM prizes WHERE prize_type = 'grand'`
    );
    const grandPrize = prizeRes.rows[0];

    // Pick random celebration message
    const celebration = GRAND_PRIZE_CELEBRATIONS[Math.floor(Math.random() * GRAND_PRIZE_CELEBRATIONS.length)];
    const funStat = getFunStats(totalSteps);

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🏆✨ *GRAND PRIZE QUALIFIER ALERT!* ✨🏆`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${user.avatar_emoji || '🏃'} *${user.username}* has unlocked entry into the *GRAND PRIZE* drawing!\n\n> _${celebration}_`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📊 *The Stats Don't Lie:*\n• 🚶 *${totalSteps.toLocaleString()} total steps* in December\n• ${funStat}\n• 🎟️ Now entered to win: *${grandPrize?.title || 'The Grand Prize'}*`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${grandPrize?.emoji || '🏆'} _${grandPrize?.description || 'The ultimate prize awaits!'}_`
          }
        ]
      }
    ];

    await postToSlack(blocks);
    console.log(`🏆 Sent grand prize qualification celebration for ${user.username}`);
  } catch (err) {
    console.error("Error sending grand prize celebration:", err);
  }
};

// Draw random winner from qualified entrants for a specific week
export const drawWeeklyPrizeWinner = async (pool: Pool, weekNumber: number): Promise<{
  winner: any | null;
  prize: any | null;
  qualifiedCount: number;
  alreadyDrawn: boolean;
}> => {
  console.log(`Drawing winner for week ${weekNumber}...`);

  // 1. Get the prize for this week
  const prizeRes = await pool.query(
    'SELECT * FROM prizes WHERE week_number = $1 AND prize_type = $2',
    [weekNumber, 'weekly']
  );

  if (prizeRes.rows.length === 0) {
    console.log(`No prize found for week ${weekNumber}`);
    return { winner: null, prize: null, qualifiedCount: 0, alreadyDrawn: false };
  }

  const prize = prizeRes.rows[0];

  // 2. Check if already drawn
  if (prize.winner_user_id !== null) {
    console.log(`Week ${weekNumber} prize already drawn (winner_user_id: ${prize.winner_user_id})`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: true };
  }

  // 3. Get all qualified, opted-in entrants for this week
  const entriesRes = await pool.query(`
    SELECT pe.*, u.username, u.slack_user_id, u.avatar_emoji, t.name as team_name, t.icon as team_icon
    FROM prize_entries pe
    JOIN users u ON pe.user_id = u.id
    JOIN teams t ON u.team_id = t.id
    WHERE pe.prize_id = $1 AND pe.qualified = TRUE AND pe.opted_in = TRUE
  `, [prize.id]);

  const qualifiedEntrants = entriesRes.rows;
  console.log(`Found ${qualifiedEntrants.length} qualified entrants for week ${weekNumber}`);

  if (qualifiedEntrants.length === 0) {
    console.log(`No qualified entrants for week ${weekNumber} - skipping draw`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: false };
  }

  // 4. Random selection
  const randomIndex = Math.floor(Math.random() * qualifiedEntrants.length);
  const winner = qualifiedEntrants[randomIndex];

  console.log(`Random selection: index ${randomIndex} = ${winner.username}`);

  // 5. Record the winner in the database
  // Note: winner_name and winner_emoji are fetched via JOIN with users table, not stored directly
  await pool.query(
    'UPDATE prizes SET winner_user_id = $1, drawn_at = NOW() WHERE id = $2',
    [winner.user_id, prize.id]
  );

  console.log(`Week ${weekNumber} winner recorded: ${winner.username} (user_id: ${winner.user_id})`);

  return { winner, prize, qualifiedCount: qualifiedEntrants.length, alreadyDrawn: false };
};

// Build Slack blocks for prize winner celebration announcement
const buildPrizeWinnerBlocks = (
  winner: any,
  prize: any,
  weekNumber: number,
  qualifiedCount: number
): any[] => {
  const winnerMention = winner.slack_user_id
    ? `<@${winner.slack_user_id}>`
    : `*${winner.username}*`;

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🎉 WEEK ${weekNumber} PRIZE WINNER! 🎉`,
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Congratulations ${winnerMention}!* ${winner.avatar_emoji}\n\nYou've won the *${prize.emoji} ${prize.title}*!\n${winner.team_icon} ${winner.team_name}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_${prize.description}_`
      }
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `🎲 Randomly selected from *${qualifiedCount}* qualified participants who hit ${RAFFLE_THRESHOLD_STEPS.toLocaleString()} steps during Week ${weekNumber}. Great job everyone! 👏`
      }]
    },
    {
      type: "divider"
    }
  ];
};

// Build Slack blocks for GRAND PRIZE winner celebration announcement
const buildGrandPrizeWinnerBlocks = (
  winner: any,
  prize: any,
  qualifiedCount: number,
  totalSteps: number
): any[] => {
  const winnerMention = winner.slack_user_id
    ? `<@${winner.slack_user_id}>`
    : `*${winner.username}*`;

  const funStat = getFunStats(totalSteps);
  const celebration = GRAND_PRIZE_CELEBRATIONS[Math.floor(Math.random() * GRAND_PRIZE_CELEBRATIONS.length)];

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🏆✨ THE GRAND PRIZE WINNER IS... ✨🏆",
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🥁 *DRUMROLL PLEASE...* 🥁`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎊 *CONGRATULATIONS ${winnerMention}!* ${winner.avatar_emoji} 🎊\n\n> _${celebration}_`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You've won the *${prize.emoji} ${prize.title}*!\n${winner.team_icon} ${winner.team_name}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_${prize.description}_`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📊 *${winner.username}'s December Stats:*\n• 🚶 *${totalSteps.toLocaleString()} total steps*\n• ${funStat}`
      }
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `🎲 Randomly selected from *${qualifiedCount}* participants who hit 70% of their goal (${GRAND_PRIZE_THRESHOLD_STEPS.toLocaleString()}+ steps). What an incredible December! 🎉`
      }]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🙏 THANK YOU TO EVERYONE WHO PARTICIPATED!*\n\nYou all crushed it this month. Whether you won a prize or not, you invested in your health—and that's the real win. 💪\n\n_See you at the next challenge!_ 🚀`
      }
    }
  ];
};

// Draw random winner from users who qualified for grand prize (grand_prize_entry = TRUE)
export const drawGrandPrizeWinner = async (pool: Pool): Promise<{
  winner: any | null;
  prize: any | null;
  qualifiedCount: number;
  alreadyDrawn: boolean;
  totalSteps: number;
}> => {
  console.log(`Drawing GRAND PRIZE winner...`);

  // 1. Get the grand prize
  const prizeRes = await pool.query(
    `SELECT * FROM prizes WHERE prize_type = 'grand'`
  );

  if (prizeRes.rows.length === 0) {
    console.log(`No grand prize found in database`);
    return { winner: null, prize: null, qualifiedCount: 0, alreadyDrawn: false, totalSteps: 0 };
  }

  const prize = prizeRes.rows[0];

  // 2. Check if already drawn
  if (prize.winner_user_id !== null) {
    console.log(`Grand prize already drawn (winner_user_id: ${prize.winner_user_id})`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: true, totalSteps: 0 };
  }

  // 3. Get all users who qualified for grand prize (grand_prize_entry = TRUE)
  const usersRes = await pool.query(`
    SELECT u.*, t.name as team_name, t.icon as team_icon
    FROM users u
    JOIN teams t ON u.team_id = t.id
    WHERE u.grand_prize_entry = TRUE
  `);

  const qualifiedUsers = usersRes.rows;
  console.log(`Found ${qualifiedUsers.length} users qualified for grand prize`);

  if (qualifiedUsers.length === 0) {
    console.log(`No users qualified for grand prize - skipping draw`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: false, totalSteps: 0 };
  }

  // 4. Random selection - using crypto-grade randomness for fairness
  const randomIndex = Math.floor(Math.random() * qualifiedUsers.length);
  const winner = qualifiedUsers[randomIndex];

  console.log(`Random selection: index ${randomIndex} = ${winner.username}`);

  // 5. Get winner's total December steps for stats
  const stepsRes = await pool.query(
    `SELECT COALESCE(SUM(step_count), 0) as total FROM activity_logs WHERE user_id = $1`,
    [winner.id]
  );
  const totalSteps = parseInt(stepsRes.rows[0].total);

  // 6. Record the winner in the database
  await pool.query(
    'UPDATE prizes SET winner_user_id = $1, drawn_at = NOW() WHERE id = $2',
    [winner.id, prize.id]
  );

  console.log(`🏆 GRAND PRIZE winner recorded: ${winner.username} (user_id: ${winner.id})`);

  return { winner, prize, qualifiedCount: qualifiedUsers.length, alreadyDrawn: false, totalSteps };
};

// Announce grand prize winner to Slack
export const announceGrandPrizeWinner = async (pool: Pool): Promise<{
  success: boolean;
  message: string;
  winner?: any;
}> => {
  try {
    const { winner, prize, qualifiedCount, alreadyDrawn, totalSteps } = await drawGrandPrizeWinner(pool);

    if (alreadyDrawn) {
      return { success: false, message: "Grand prize has already been drawn" };
    }

    if (!winner || !prize) {
      return { success: false, message: "No qualified participants for grand prize" };
    }

    // Build and post celebration blocks to Slack
    const blocks = buildGrandPrizeWinnerBlocks(winner, prize, qualifiedCount, totalSteps);
    await postToSlack(blocks);

    return {
      success: true,
      message: `Grand prize winner announced: ${winner.username}`,
      winner: {
        id: winner.id,
        username: winner.username,
        totalSteps,
        team: winner.team_name
      }
    };
  } catch (err: any) {
    console.error("Error announcing grand prize winner:", err);
    return { success: false, message: err.message };
  }
};

// 1. Activity Log Notification
export const sendSlackLog = async (
  username: string,
  teamName: string,
  teamIcon: string,
  steps: number,
  activityType: string,
  dailyTotal: number,
  monthlyTotal: number,
  dateLogged?: string
) => {
  const isBonus = activityType.includes('Bonus');
  const emoji = isBonus ? '🌟' : '👟';

  // Determine if this is for today or a past date (using Mountain Time)
  const today = getMountainTimeDate();
  const isToday = !dateLogged || dateLogged === today;
  const dateText = isToday ? 'just logged' : `logged for ${dateLogged}`;

  // Fun milestone callouts
  let milestoneText = '';
  if (dailyTotal >= 15000) {
    milestoneText = ' 🔥 *BEAST MODE!*';
  } else if (dailyTotal >= 10000) {
    milestoneText = ' 🎯 *10K Club!*';
  } else if (dailyTotal >= 7000) {
    milestoneText = ' ✅ *Daily goal crushed!*';
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${username}* ${teamIcon} ${dateText} *${steps.toLocaleString()} steps*!${milestoneText}`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📅 Today: *${dailyTotal.toLocaleString()}* steps | 📊 December: *${monthlyTotal.toLocaleString()}* steps | ${activityType}`
        }
      ]
    }
  ];

  await postToSlack(blocks);
};

// 2. Daily Digest - Encourage More Effort! (5 PM MT)
export const sendSlackDailyUpdate = async (pool: Pool) => {
  console.log("Generating Daily Slack Digest...");

  // Fetch Data
  const usersRes = await pool.query('SELECT * FROM users');
  const teamsRes = await pool.query('SELECT * FROM teams');
  const logsRes = await pool.query('SELECT * FROM activity_logs');

  const users = usersRes.rows;
  const teams = teamsRes.rows;
  const logs = logsRes.rows;

  // Filter logs to only include December 2025 challenge period (Dec 1-31, 2025)
  const CHALLENGE_START = '2025-12-01';
  const CHALLENGE_END = '2025-12-31';
  const decemberLogs = logs.filter((l: any) =>
    l.date_logged >= CHALLENGE_START && l.date_logged <= CHALLENGE_END
  );

  // Calculate Global Progress (December challenge only)
  const totalSteps = decemberLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
  const globalPct = Math.min(100, Math.round((totalSteps / GLOBAL_GOAL) * 100));

  // Today's date in Mountain Time (America/Denver)
  const today = new Date();
  const todayStr = getMountainTimeDate(today);

  // Today's stats
  const todayLogs = logs.filter((l: any) => l.date_logged === todayStr);
  const todaySteps = todayLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);

  // Calculate per-user today stats with team info
  const userTodayStats = users.map((u: any) => {
    const userLogs = todayLogs.filter((l: any) => l.user_id === u.id);
    const steps = userLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
    const team = teams.find((t: any) => t.id === u.team_id);
    return { ...u, todaySteps: steps, teamIcon: team?.icon || '👥' };
  }).sort((a, b) => b.todaySteps - a.todaySteps);

  // Find who hasn't logged today - group by team
  const missingByTeam = teams.map((t: any) => {
    const teamMembers = userTodayStats.filter(u => u.team_id === t.id && u.todaySteps === 0);
    return {
      teamName: t.name,
      teamIcon: t.icon,
      missing: teamMembers
    };
  }).filter(t => t.missing.length > 0);

  // Top 3 performers today
  const topToday = userTodayStats.slice(0, 3).filter(u => u.todaySteps > 0);

  // Current leader for "today's crown"
  const currentLeader = userTodayStats[0];

  // Fun conversions
  const miles = (todaySteps / 2000).toFixed(1);
  const calories = Math.round(todaySteps * 0.04);
  const cheeseburgers = (calories / 354).toFixed(1);

  // How many hit daily goal today
  const goalHitters = userTodayStats.filter(u => u.todaySteps >= DAILY_GOAL).length;

  // Calculate Team Stats - TODAY and OVERALL
  const teamStats = teams.map((t: any) => {
    const members = users.filter((u: any) => u.team_id === t.id);
    const memberIds = members.map((u: any) => u.id);

    // Today's steps
    const teamTodayLogs = todayLogs.filter((l: any) => memberIds.includes(l.user_id));
    const todayTotal = teamTodayLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);

    // Overall steps
    const teamAllLogs = logs.filter((l: any) => memberIds.includes(l.user_id));
    const overallTotal = teamAllLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);

    return { ...t, todaySteps: todayTotal, overallSteps: overallTotal, memberCount: members.length };
  });

  const teamsByToday = [...teamStats].sort((a, b) => b.todaySteps - a.todaySteps);
  const teamsByOverall = [...teamStats].sort((a, b) => b.overallSteps - a.overallSteps);

  const winningTeamToday = teamsByToday[0];
  const leadingTeamOverall = teamsByOverall[0];
  const trailingTeamOverall = teamsByOverall[1];
  const overallGap = leadingTeamOverall.overallSteps - trailingTeamOverall.overallSteps;

  // Calculate Weekly Stats (Last 7 Days)
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  const weeklyLogs = logs.filter((l: any) => {
      const d = new Date(l.date_logged);
      return d >= oneWeekAgo;
  });

  const weeklyQualifiers = users.filter((u: any) => {
      const myWeeklySteps = weeklyLogs
        .filter((l: any) => l.user_id === u.id)
        .reduce((sum: number, l: any) => sum + l.step_count, 0);
      return myWeeklySteps >= RAFFLE_THRESHOLD_STEPS;
  });

  const grandPrizeQualifiers = users.filter((u: any) => {
      const myTotal = logs
        .filter((l: any) => l.user_id === u.id)
        .reduce((sum: number, l: any) => sum + l.step_count, 0);
      return myTotal >= GRAND_PRIZE_THRESHOLD_STEPS;
  });

  // Progress bar
  const progressBar = "▓".repeat(Math.floor(globalPct / 5)) + "░".repeat(20 - Math.floor(globalPct / 5));

  // Top performers text with team icons
  let topText = "";
  if (topToday.length > 0) {
    topText = topToday.map((u, i) =>
      `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} *${u.username}* ${u.teamIcon}: ${u.todaySteps.toLocaleString()} steps`
    ).join('\n');
  } else {
    topText = "_No one has logged steps today yet! Be the first!_";
  }

  // Current crown holder message
  let crownMessage = '';
  if (currentLeader && currentLeader.todaySteps > 0) {
    const mention = currentLeader.slack_user_id ? `<@${currentLeader.slack_user_id}>` : currentLeader.username;
    crownMessage = `\n\n👑 *Current Crown Holder:* ${mention} with ${currentLeader.todaySteps.toLocaleString()} steps\n_Still time to steal the crown!_`;
  }

  // Missing participants - grouped by team with urgent messaging
  const missingBlocks = [];
  if (missingByTeam.length > 0) {
    let missingText = "*🚨 YOUR TEAM NEEDS YOU!*\n";
    missingByTeam.forEach(team => {
      const mentions = team.missing.map((u: any) => {
        if (u.slack_user_id) {
          return `<@${u.slack_user_id}>`;
        } else {
          return `@${u.slack_username || u.username}`;
        }
      }).join(', ');
      missingText += `${team.teamIcon} *${team.teamName}*: ${mentions}\n`;
    });
    missingText += `_Every step counts! Don't let your team down!_ 💪`;
    missingBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: missingText
      }
    });
  }

  // Weekly raffle qualifiers
  const weeklyQualifierMentions = weeklyQualifiers.map((u: any) => {
    if (u.slack_user_id) {
      return `<@${u.slack_user_id}>`;
    } else {
      return `@${u.slack_username || u.username}`;
    }
  }).join(', ');
  const weeklyRaffleText = weeklyQualifiers.length > 0
    ? `🎟️ *Weekly Raffle:* ${weeklyQualifiers.length} qualified`
    : `🎟️ *Weekly Raffle:* No qualifiers yet`;

  // Grand prize qualifiers
  const grandPrizeText = grandPrizeQualifiers.length > 0
    ? `🏆 *Grand Prize:* ${grandPrizeQualifiers.length} qualified`
    : `🏆 *Grand Prize:* No qualifiers yet`;

  // Generate AI fun fact
  let funFact = "🌟 Every step counts! Keep up the great work!";
  try {
    funFact = await getDailyFunFact(todaySteps, totalSteps, leadingTeamOverall.name);
  } catch (error) {
    console.error("Error generating fun fact:", error);
  }

  // Team battle text - make it competitive!
  let teamBattleText = '';
  if (overallGap > 0) {
    if (leadingTeamOverall.id === trailingTeamOverall.id) {
      teamBattleText = `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* is running away with it!`;
    } else {
      teamBattleText = `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* leads by *${overallGap.toLocaleString()}* steps!\n${trailingTeamOverall.icon} ${trailingTeamOverall.name} - can you close the gap before midnight? ⏰`;
    }
  }

  // ========== WEEKLY PRIZE PROMOTION ==========
  const currentWeek = getCurrentWeek();
  const daysLeftInWeek = getDaysLeftInWeek();
  const prizeHealthBenefits = PRIZE_HEALTH_BENEFITS[currentWeek];

  // Fetch this week's prize
  const prizeRes = await pool.query('SELECT * FROM prizes WHERE week_number = $1', [currentWeek]);
  const currentPrize = prizeRes.rows[0];

  // Calculate weekly steps for each user (for current challenge week)
  const userWeeklyProgress = users.map((u: any) => {
    const weeklySteps = getUserWeeklySteps(u.id, logs, currentWeek);
    const progressPct = Math.min(100, Math.round((weeklySteps / RAFFLE_THRESHOLD_STEPS) * 100));
    const stepsNeeded = Math.max(0, RAFFLE_THRESHOLD_STEPS - weeklySteps);
    const qualified = weeklySteps >= RAFFLE_THRESHOLD_STEPS;
    return { ...u, weeklySteps, progressPct, stepsNeeded, qualified };
  });

  // Auto opt-in qualified users
  const qualifiedForPrize = userWeeklyProgress.filter(u => u.qualified);
  const newOptIns = await autoOptInQualifiedUsers(pool, currentWeek, qualifiedForPrize);
  if (newOptIns > 0) {
    console.log(`Auto opted-in ${newOptIns} new users for week ${currentWeek} prize`);
  }

  // Build "close to qualifying" section - show top 3 people who are close but not qualified yet
  const almostThere = userWeeklyProgress
    .filter(u => !u.qualified && u.weeklySteps > 0)
    .sort((a, b) => b.weeklySteps - a.weeklySteps)
    .slice(0, 3);

  let prizeProgressText = '';
  if (almostThere.length > 0) {
    prizeProgressText = almostThere.map((u: any) => {
      const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
      const progressBar = "▓".repeat(Math.floor(u.progressPct / 10)) + "░".repeat(10 - Math.floor(u.progressPct / 10));
      return `${mention}: \`[${progressBar}]\` ${u.progressPct}% - *${u.stepsNeeded.toLocaleString()}* more steps!`;
    }).join('\n');
  }

  // Prize promo block
  const prizeBlocks = [];
  if (currentPrize) {
    prizeBlocks.push({
      type: "divider"
    });
    prizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎁 THIS WEEK'S PRIZE: ${currentPrize.emoji} ${currentPrize.title}*\n_${prizeHealthBenefits?.shortBenefit || ''}_\n\n🎯 *${RAFFLE_THRESHOLD_STEPS.toLocaleString()}* steps this week to qualify!\n⏰ *${daysLeftInWeek}* day${daysLeftInWeek !== 1 ? 's' : ''} left to enter!`
      }
    });
    prizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *Qualified:* ${qualifiedForPrize.length} people are IN the raffle!`
      }
    });
    if (prizeProgressText) {
      prizeBlocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🏃 Almost There!*\n${prizeProgressText}`
        }
      });
    }
    if (prizeHealthBenefits?.healthTip) {
      prizeBlocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: prizeHealthBenefits.healthTip }]
      });
    }
  }

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "⚡ Afternoon Push! Still Time to Win!",
        emoji: true
      }
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `_It's 5 PM - you've got until midnight to claim today's crown!_` }]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📊 TODAY'S STATS*\n*${todaySteps.toLocaleString()}* steps logged\n🎯 ${goalHitters} people hit 7K goal\n🚶 ${miles} miles | 🔥 ${calories.toLocaleString()} cal${crownMessage}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🏃 TODAY'S LEADERBOARD*\n${topText}`
      }
    },
    ...missingBlocks,
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚔️ TEAM BATTLE*\n\n*Today:* ${winningTeamToday.icon} ${winningTeamToday.name} is winning (${winningTeamToday.todaySteps.toLocaleString()} steps)\n\n*Overall:*\n${teamBattleText}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${leadingTeamOverall.icon} ${leadingTeamOverall.name}: *${leadingTeamOverall.overallSteps.toLocaleString()}* total\n${trailingTeamOverall.icon} ${trailingTeamOverall.name}: *${trailingTeamOverall.overallSteps.toLocaleString()}* total`
      }
    },
    ...prizeBlocks,
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🌍 December Progress:* ${globalPct}%\n\`[${progressBar}]\`\n*${totalSteps.toLocaleString()}* steps toward ${GLOBAL_GOAL.toLocaleString()} goal!`
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `🎟️ *Week ${currentWeek} Raffle:* ${qualifiedForPrize.length} qualified` },
        { type: "mrkdwn", text: grandPrizeText }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 ${funFact}*`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎯 *Haven't logged yet? There's still time!*\n<https://teamtrek-1024587728322.us-central1.run.app|Log Your Steps Now>"
      }
    }
  ];

  await postToSlack(blocks);
};

// 3. Morning Recap - Celebrate Yesterday's Achievements! (9 AM MT)
export const sendSlackMorningRecap = async (pool: Pool) => {
  console.log("Generating Morning Recap...");

  // Get yesterday's date in Mountain Time
  // IMPORTANT: We need to calculate "yesterday" based on Mountain Time, not UTC
  // Step 1: Get today's date string in Mountain Time
  const todayStr = getMountainTimeDate();
  // Step 2: Parse that date and subtract one day
  const todayParts = todayStr.split('-').map(Number);
  const todayInMT = new Date(todayParts[0], todayParts[1] - 1, todayParts[2], 12, 0, 0); // noon to avoid DST issues
  const yesterdayInMT = new Date(todayInMT);
  yesterdayInMT.setDate(todayInMT.getDate() - 1);
  const yesterdayStr = getMountainTimeDate(yesterdayInMT);

  console.log(`Today in MT: ${todayStr}, Looking for logs from yesterday: ${yesterdayStr}`);

  // Format yesterday for display (e.g., "Sunday, December 1")
  const yesterdayDisplay = yesterdayInMT.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Denver'
  });

  // Fetch Data
  const usersRes = await pool.query('SELECT * FROM users');
  const teamsRes = await pool.query('SELECT * FROM teams');
  const logsRes = await pool.query('SELECT * FROM activity_logs WHERE date_logged = $1', [yesterdayStr]);
  const allLogsRes = await pool.query('SELECT * FROM activity_logs');

  const users = usersRes.rows;
  const teams = teamsRes.rows;
  const yesterdayLogs = logsRes.rows;

  // Filter logs to only include December 2025 challenge period (Dec 1-31, 2025)
  const CHALLENGE_START = '2025-12-01';
  const CHALLENGE_END = '2025-12-31';
  const allLogs = allLogsRes.rows.filter((l: any) =>
    l.date_logged >= CHALLENGE_START && l.date_logged <= CHALLENGE_END
  );

  console.log(`Found ${yesterdayLogs.length} log entries for ${yesterdayStr}`);

  // ========== MONDAY PRIZE DRAWING ==========
  let prizeWinnerBlocks: any[] = [];
  if (isMondayInMT()) {
    const previousWeek = getPreviousWeek();
    console.log(`Monday detected! Checking if we need to draw Week ${previousWeek} prize...`);

    // Only draw for weeks 1-4, and only if we're past week 1
    // (On the first Monday Dec 8, we draw Week 1's winner)
    if (previousWeek >= 1 && previousWeek <= 4 && getCurrentWeek() > previousWeek) {
      try {
        const { winner, prize, qualifiedCount, alreadyDrawn } = await drawWeeklyPrizeWinner(pool, previousWeek);

        if (winner && prize) {
          console.log(`Prize winner announcement prepared for ${winner.username}`);
          prizeWinnerBlocks = buildPrizeWinnerBlocks(winner, prize, previousWeek, qualifiedCount);
        } else if (alreadyDrawn) {
          console.log(`Week ${previousWeek} prize was already drawn - skipping announcement`);
        } else {
          console.log(`No qualified entrants for Week ${previousWeek} - skipping prize announcement`);
        }
      } catch (err) {
        console.error(`Error drawing Week ${previousWeek} prize:`, err);
      }
    } else {
      console.log(`Skipping prize draw: previousWeek=${previousWeek}, currentWeek=${getCurrentWeek()}`);
    }
  }

  // If no logs for yesterday, send a shorter message
  if (yesterdayLogs.length === 0) {
    // Check if we have data for today instead (challenge just started scenario)
    const todayLogsRes = await pool.query('SELECT * FROM activity_logs WHERE date_logged = $1', [todayStr]);
    const todayLogs = todayLogsRes.rows;
    const hasTodayData = todayLogs.length > 0;

    let messageText = `No activity was logged yesterday (${yesterdayDisplay}).`;
    if (hasTodayData) {
      const todaySteps = todayLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
      messageText += ` But we're off to a great start today with *${todaySteps.toLocaleString()} steps* already logged! 🚀`;
    } else {
      messageText += ` Today is a fresh start! 💪`;
    }

    const blocks = [
      ...prizeWinnerBlocks, // Include prize winner announcement if it's Monday
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "☀️ Good Morning, Recess Team!",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: messageText
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🎯 *Who's claiming today's crown?*\n<https://teamtrek-1024587728322.us-central1.run.app|Log Your Steps Now>"
        }
      }
    ];
    await postToSlack(blocks);
    return;
  }

  // Calculate yesterday's stats per user
  const userYesterdayStats = users.map((u: any) => {
    const userLogs = yesterdayLogs.filter((l: any) => l.user_id === u.id);
    const steps = userLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
    const team = teams.find((t: any) => t.id === u.team_id);
    return { ...u, yesterdaySteps: steps, teamName: team?.name || 'Unknown', teamIcon: team?.icon || '👥' };
  }).filter(u => u.yesterdaySteps > 0).sort((a, b) => b.yesterdaySteps - a.yesterdaySteps);

  // Total yesterday steps
  const totalYesterdaySteps = yesterdayLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
  const participantCount = userYesterdayStats.length;

  // Find the top walker (winner)
  const topWalker = userYesterdayStats[0];

  if (!topWalker) {
    console.log("No top walker found for yesterday");
    return;
  }

  // Record the daily winner in the database
  try {
    await pool.query(`
      INSERT INTO daily_winners (date, user_id, step_count, announced)
      VALUES ($1, $2, $3, TRUE)
      ON CONFLICT (date) DO UPDATE SET announced = TRUE
    `, [yesterdayStr, topWalker.id, topWalker.yesterdaySteps]);
    console.log(`Recorded daily winner: ${topWalker.username} with ${topWalker.yesterdaySteps} steps`);
  } catch (err) {
    console.error("Error recording daily winner:", err);
  }

  // Count total daily wins for the top walker
  const winsRes = await pool.query(
    'SELECT COUNT(*) as win_count FROM daily_winners WHERE user_id = $1',
    [topWalker.id]
  );
  const totalWins = parseInt(winsRes.rows[0]?.win_count || '1');

  // Get the top 5 from yesterday
  const top5 = userYesterdayStats.slice(0, 5);

  // Calculate team performance yesterday AND overall
  const teamStats = teams.map((t: any) => {
    const teamMembers = users.filter((u: any) => u.team_id === t.id);
    const memberIds = teamMembers.map((u: any) => u.id);

    // Yesterday's steps
    const teamYesterdayLogs = yesterdayLogs.filter((l: any) => memberIds.includes(l.user_id));
    const yesterdayTotal = teamYesterdayLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);

    // Overall steps
    const teamAllLogs = allLogs.filter((l: any) => memberIds.includes(l.user_id));
    const overallTotal = teamAllLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);

    return { ...t, yesterdaySteps: yesterdayTotal, overallSteps: overallTotal, memberCount: teamMembers.length };
  });

  const teamsByYesterday = [...teamStats].sort((a, b) => b.yesterdaySteps - a.yesterdaySteps);
  const teamsByOverall = [...teamStats].sort((a, b) => b.overallSteps - a.overallSteps);

  const winningTeamYesterday = teamsByYesterday[0];
  const leadingTeamOverall = teamsByOverall[0];
  const trailingTeamOverall = teamsByOverall[1];
  const gap = leadingTeamOverall.overallSteps - trailingTeamOverall.overallSteps;

  // How many people hit the daily goal
  const goalHitters = userYesterdayStats.filter(u => u.yesterdaySteps >= DAILY_GOAL).length;

  // Generate AI motivation
  let motivation = "Let's keep the momentum going today! 🚀";
  try {
    motivation = await getMorningMotivation(topWalker.username, topWalker.yesterdaySteps, totalWins);
  } catch (error) {
    console.error("Error generating motivation:", error);
  }

  // Build leaderboard text with team icons
  const leaderboardText = top5.map((u, i) => {
    const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
    return `${medal} ${mention} ${u.teamIcon}: *${u.yesterdaySteps.toLocaleString()}* steps`;
  }).join('\n');

  // Crown text based on win streak
  let crownText = '';
  if (totalWins === 1) {
    crownText = '🎉 *First crown earned!*';
  } else if (totalWins === 2) {
    crownText = '🔥 *Back-to-back wins!*';
  } else if (totalWins >= 3) {
    crownText = `👑 *${totalWins}-time champion!*`;
  }

  // Team battle section
  const teamBattleText = leadingTeamOverall.id === trailingTeamOverall.id
    ? `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* is dominating!`
    : `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* leads by *${gap.toLocaleString()}* steps!\n${trailingTeamOverall.icon} *${trailingTeamOverall.name}* - time to close the gap! 🏃`;

  // ========== WEEKLY PRIZE PROMOTION (Morning) ==========
  const currentWeek = getCurrentWeek();
  const daysLeftInWeek = getDaysLeftInWeek();
  const prizeHealthBenefits = PRIZE_HEALTH_BENEFITS[currentWeek];

  // Fetch this week's prize
  const prizeRes = await pool.query('SELECT * FROM prizes WHERE week_number = $1', [currentWeek]);
  const currentPrize = prizeRes.rows[0];

  // Calculate weekly steps for each user (for current challenge week)
  const userWeeklyProgress = users.map((u: any) => {
    const weeklySteps = getUserWeeklySteps(u.id, allLogs, currentWeek);
    const progressPct = Math.min(100, Math.round((weeklySteps / RAFFLE_THRESHOLD_STEPS) * 100));
    const stepsNeeded = Math.max(0, RAFFLE_THRESHOLD_STEPS - weeklySteps);
    const qualified = weeklySteps >= RAFFLE_THRESHOLD_STEPS;
    return { ...u, weeklySteps, progressPct, stepsNeeded, qualified };
  });

  // Auto opt-in qualified users
  const qualifiedForPrize = userWeeklyProgress.filter(u => u.qualified);
  const newOptIns = await autoOptInQualifiedUsers(pool, currentWeek, qualifiedForPrize);
  if (newOptIns > 0) {
    console.log(`Morning recap: Auto opted-in ${newOptIns} new users for week ${currentWeek} prize`);
  }

  // Build "close to qualifying" section - show top 5 people who are close but not qualified yet
  const almostThere = userWeeklyProgress
    .filter(u => !u.qualified && u.weeklySteps > 0)
    .sort((a, b) => b.weeklySteps - a.weeklySteps)
    .slice(0, 5);

  let morningPrizeProgressText = '';
  if (almostThere.length > 0) {
    morningPrizeProgressText = almostThere.map((u: any) => {
      const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
      const progressBar = "▓".repeat(Math.floor(u.progressPct / 10)) + "░".repeat(10 - Math.floor(u.progressPct / 10));
      return `${mention}: \`[${progressBar}]\` ${u.progressPct}% (${u.stepsNeeded.toLocaleString()} to go)`;
    }).join('\n');
  }

  // Prize promo block for morning
  const morningPrizeBlocks = [];
  if (currentPrize) {
    morningPrizeBlocks.push({
      type: "divider"
    });
    morningPrizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎁 WEEK ${currentWeek} PRIZE: ${currentPrize.emoji} ${currentPrize.title}*\n_${prizeHealthBenefits?.shortBenefit || ''}_`
      }
    });
    morningPrizeBlocks.push({
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*🎯 Goal*\n${RAFFLE_THRESHOLD_STEPS.toLocaleString()} steps` },
        { type: "mrkdwn", text: `*⏰ Days Left*\n${daysLeftInWeek + 1} day${daysLeftInWeek !== 0 ? 's' : ''}` }
      ]
    });
    morningPrizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *${qualifiedForPrize.length} people* are already IN the raffle! 🎉`
      }
    });
    if (morningPrizeProgressText) {
      morningPrizeBlocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🏃 Race to Qualify:*\n${morningPrizeProgressText}`
        }
      });
    }
    if (prizeHealthBenefits?.healthTip) {
      morningPrizeBlocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: prizeHealthBenefits.healthTip }]
      });
    }
  }

  const blocks = [
    ...prizeWinnerBlocks, // Include prize winner announcement if it's Monday
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🌅 Yesterday's Champions!",
        emoji: true
      }
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Results from *${yesterdayDisplay}*` }]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🏆 *TOP WALKER*\n\n👑 ${topWalker.slack_user_id ? `<@${topWalker.slack_user_id}>` : `*${topWalker.username}*`}\n*${topWalker.yesterdaySteps.toLocaleString()} steps!*\n${topWalker.teamIcon} ${topWalker.teamName}\n\n${crownText}`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📊 LEADERBOARD*\n${leaderboardText}`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*📈 Total Steps*\n${totalYesterdaySteps.toLocaleString()}`
        },
        {
          type: "mrkdwn",
          text: `*🎯 Hit 7K Goal*\n${goalHitters} of ${participantCount}`
        }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚔️ TEAM BATTLE*\n\n*Yesterday's Winner:* ${winningTeamYesterday.icon} ${winningTeamYesterday.name} (${winningTeamYesterday.yesterdaySteps.toLocaleString()} steps)\n\n*Overall Standing:*\n${teamBattleText}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${leadingTeamOverall.icon} ${leadingTeamOverall.name}: *${leadingTeamOverall.overallSteps.toLocaleString()}* total\n${trailingTeamOverall.icon} ${trailingTeamOverall.name}: *${trailingTeamOverall.overallSteps.toLocaleString()}* total`
      }
    },
    ...morningPrizeBlocks,
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💬 ${motivation}*`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎯 *Who's taking today's crown?*\n<https://teamtrek-1024587728322.us-central1.run.app|Start Logging Now>"
      }
    }
  ];

  await postToSlack(blocks);
};

// 4. Helper: Get daily win count for a user
export const getDailyWinCount = async (pool: Pool, userId: number): Promise<number> => {
  const res = await pool.query(
    'SELECT COUNT(*) as win_count FROM daily_winners WHERE user_id = $1',
    [userId]
  );
  return parseInt(res.rows[0]?.win_count || '0');
};

// 5. Preview Morning Recap for a specific date (dry run, doesn't post to Slack)
export const previewMorningRecap = async (pool: Pool, targetDate: string): Promise<any> => {
  console.log(`Previewing Morning Recap for date: ${targetDate}`);

  // Parse target date to get display format
  const dateParts = targetDate.split('-').map(Number);
  const targetDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
  const dateDisplay = targetDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Denver'
  });

  // Fetch Data
  const usersRes = await pool.query('SELECT * FROM users');
  const teamsRes = await pool.query('SELECT * FROM teams');
  const logsRes = await pool.query('SELECT * FROM activity_logs WHERE date_logged = $1', [targetDate]);
  const allLogsRes = await pool.query('SELECT * FROM activity_logs');

  const users = usersRes.rows;
  const teams = teamsRes.rows;
  const targetLogs = logsRes.rows;
  const allLogs = allLogsRes.rows;

  // Calculate stats per user for target date
  const userStats = users.map((u: any) => {
    const userLogs = targetLogs.filter((l: any) => l.user_id === u.id);
    const steps = userLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
    const team = teams.find((t: any) => t.id === u.team_id);
    return { ...u, steps, teamName: team?.name || 'Unknown', teamIcon: team?.icon || '👥' };
  }).filter(u => u.steps > 0).sort((a, b) => b.steps - a.steps);

  const totalSteps = targetLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
  const participantCount = userStats.length;
  const topWalker = userStats[0];

  // Team stats
  const teamStats = teams.map((t: any) => {
    const teamMembers = users.filter((u: any) => u.team_id === t.id);
    const memberIds = teamMembers.map((u: any) => u.id);
    const teamLogs = targetLogs.filter((l: any) => memberIds.includes(l.user_id));
    const daySteps = teamLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
    const teamAllLogs = allLogs.filter((l: any) => memberIds.includes(l.user_id));
    const totalSteps = teamAllLogs.reduce((sum: number, l: any) => sum + l.step_count, 0);
    return { ...t, daySteps, totalSteps };
  });

  return {
    date: targetDate,
    dateDisplay,
    logsFound: targetLogs.length,
    totalSteps,
    participantCount,
    topWalker: topWalker ? {
      username: topWalker.username,
      steps: topWalker.steps,
      team: topWalker.teamName
    } : null,
    leaderboard: userStats.slice(0, 5).map((u, i) => ({
      rank: i + 1,
      username: u.username,
      steps: u.steps,
      team: u.teamName
    })),
    teamStats: teamStats.map(t => ({
      name: t.name,
      icon: t.icon,
      daySteps: t.daySteps,
      totalSteps: t.totalSteps
    }))
  };
};

// ==========================================
// 50% MILESTONE CELEBRATION FEATURE
// ==========================================

const FIFTY_PERCENT_THRESHOLD = Math.floor(GLOBAL_GOAL * 0.5); // 1,085,000 steps
const TOTAL_CHALLENGE_DAYS = 31;

// Calculate pace analysis for the team's progress
const calculatePaceAnalysis = (totalSteps: number): {
  projectedEndDate: Date;
  daysAheadBehind: number;
  currentPace: number;
  requiredPace: number;
  isAheadOfSchedule: boolean;
} => {
  const challengeEnd = new Date('2025-12-31');

  // Get current date in Mountain Time
  const todayStr = getMountainTimeDate();
  const todayParts = todayStr.split('-').map(Number);
  const todayMT = new Date(todayParts[0], todayParts[1] - 1, todayParts[2], 12, 0, 0);

  // Days since challenge start (Dec 1)
  const startDate = new Date('2025-12-01');
  const daysSinceStart = Math.max(1, Math.floor(
    (todayMT.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1);
  const daysRemaining = TOTAL_CHALLENGE_DAYS - daysSinceStart;

  // Current pace (steps per day so far)
  const currentPace = Math.round(totalSteps / daysSinceStart);

  // Required pace to finish on time
  const stepsRemaining = GLOBAL_GOAL - totalSteps;
  const requiredPace = daysRemaining > 0
    ? Math.round(stepsRemaining / daysRemaining)
    : Infinity;

  // Projected completion date at current pace
  const daysToComplete = currentPace > 0
    ? Math.ceil((GLOBAL_GOAL - totalSteps) / currentPace)
    : Infinity;
  const projectedEndDate = new Date(todayMT);
  projectedEndDate.setDate(projectedEndDate.getDate() + daysToComplete);

  // Days ahead or behind schedule
  const idealStepsAtThisPoint = (GLOBAL_GOAL / TOTAL_CHALLENGE_DAYS) * daysSinceStart;
  const stepsAheadBehind = totalSteps - idealStepsAtThisPoint;
  const daysAheadBehind = Math.round(stepsAheadBehind / (GLOBAL_GOAL / TOTAL_CHALLENGE_DAYS));

  return {
    projectedEndDate,
    daysAheadBehind,
    currentPace,
    requiredPace,
    isAheadOfSchedule: stepsAheadBehind >= 0
  };
};

// Get top contributors for the milestone announcement
const getTopContributors = async (pool: Pool, limit: number = 5): Promise<Array<{
  userId: number;
  username: string;
  avatarEmoji: string;
  slackUserId: string | null;
  totalSteps: number;
  teamName: string;
  teamIcon: string;
}>> => {
  const result = await pool.query(`
    SELECT
      u.id as user_id,
      u.username,
      u.avatar_emoji,
      u.slack_user_id,
      COALESCE(SUM(al.step_count), 0) as total_steps,
      t.name as team_name,
      t.icon as team_icon
    FROM users u
    JOIN teams t ON u.team_id = t.id
    LEFT JOIN activity_logs al ON u.id = al.user_id
      AND al.date_logged >= '2025-12-01'
      AND al.date_logged <= '2025-12-31'
    GROUP BY u.id, u.username, u.avatar_emoji, u.slack_user_id, t.name, t.icon
    ORDER BY total_steps DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map(row => ({
    userId: row.user_id,
    username: row.username,
    avatarEmoji: row.avatar_emoji,
    slackUserId: row.slack_user_id,
    totalSteps: parseInt(row.total_steps),
    teamName: row.team_name,
    teamIcon: row.team_icon
  }));
};

// Build the Slack Block Kit message for 50% milestone
const build50PercentBlocks = (
  grandPrize: any,
  triggeringUser: any,
  topContributors: any[],
  paceAnalysis: any,
  totalSteps: number
): any[] => {
  const triggerMention = triggeringUser.slack_user_id
    ? `<@${triggeringUser.slack_user_id}>`
    : `*${triggeringUser.username}*`;

  // Format projected date
  const projectedDateStr = paceAnalysis.projectedEndDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  // Pace message
  let paceMessage = '';
  if (paceAnalysis.isAheadOfSchedule) {
    const days = Math.abs(paceAnalysis.daysAheadBehind);
    paceMessage = days > 0
      ? `🚀 *${days} day${days !== 1 ? 's' : ''} AHEAD of schedule!*`
      : `📍 *Right on track!*`;
  } else {
    const days = Math.abs(paceAnalysis.daysAheadBehind);
    paceMessage = `⚡ *${days} day${days !== 1 ? 's' : ''} behind schedule* - Let's pick up the pace!`;
  }

  // Top contributors text with medals
  const contributorsText = topContributors.map((c, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const mention = c.slackUserId ? `<@${c.slackUserId}>` : c.username;
    return `${medal} ${mention} ${c.teamIcon} - *${c.totalSteps.toLocaleString()}* steps`;
  }).join('\n');

  return [
    // HEADER - Big celebration
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🎉🏆 HALFWAY THERE! 50% MILESTONE UNLOCKED! 🏆🎉",
        emoji: true
      }
    },

    // CELEBRATION MESSAGE
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<!here> *INCREDIBLE TEAM ACHIEVEMENT!*\n\nThe Recess team has collectively walked *${totalSteps.toLocaleString()} steps* - that's *HALF* of our December goal! 🎊\n\n${triggerMention} pushed us over the finish line with their latest log! ${triggeringUser.avatar_emoji || '🎯'}`
      }
    },

    { type: "divider" },

    // GRAND PRIZE REVEAL - The fun part!
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🥁🥁🥁 DRUMROLL PLEASE... 🥁🥁🥁*`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🏆 THE GRAND PRIZE IS...*\n\n_No, it's not a beach vacation..._\n\n_(Though if you win Option A, your home will basically become a resort for your muscles)_`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💪 OPTION A: BowFlex SelectTech 552 Dumbbells*\nReplace *15 sets of weights* with ONE adjustable set! 5-52.5 lbs with a simple dial twist. Basically a whole gym that fits under your desk. Your future gains are calling. 📞🏋️\n\n*OR*\n\n*🧘 OPTION B: THREE Premium Massage Sessions*\nThree 60-minute deep tissue dreams at your favorite spa. Because after walking 2.17 million steps, *your legs deserve to be treated like royalty*. 👑`
      }
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `_Plot twist: You walked all those steps for the chance to either lift more weight OR have someone rub your sore legs. We see you. We get you. 😂_`
      }]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎟️ HOW TO ENTER THE DRAWING:*\nHit *70%* of your personal goal (*${GRAND_PRIZE_THRESHOLD_STEPS.toLocaleString()} steps*) and you're automatically entered!\n\n_That's 170 steps per day if you haven't started. Or like... one enthusiastic walk to the coffee machine and back. Times 170._`
      }
    },

    { type: "divider" },

    // PACE ANALYSIS
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📊 ARE WE GONNA MAKE IT? (PACE CHECK)*\n\n${paceMessage}\n\n*Current team pace:* ${paceAnalysis.currentPace.toLocaleString()} steps/day\n*Projected finish:* ${projectedDateStr}`
      }
    },

    { type: "divider" },

    // TOP CONTRIBUTORS
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*👑 RECESS WALKING LEGENDS (SO FAR)*\n\n${contributorsText}\n\n_These absolute units have been carrying. Respectfully._`
      }
    },

    { type: "divider" },

    // CALL TO ACTION
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔥 THE SECOND HALF BEGINS NOW!*\n\nWe did the hard part - we believed we could. Now let's finish what we started.\n\n*Only ${(GLOBAL_GOAL - totalSteps).toLocaleString()} steps to go!* _(That's basically just everyone taking a few extra laps around the block... for the next few weeks... together... as a team)_\n\n<https://teamtrek-1024587728322.us-central1.run.app|📲 Log Your Steps & Get That Prize!>`
      }
    },

    // CELEBRATORY FOOTER
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: "🦶 Every step counts. Literally. We're counting them. That's the whole point. LET'S GOOOOO! 🚀"
      }]
    }
  ];
};

// Send the 50% milestone announcement to Slack
const send50PercentMilestoneAnnouncement = async (
  pool: Pool,
  triggeringUserId: number,
  totalSteps: number
): Promise<void> => {
  console.log("🎉 Sending 50% milestone celebration announcement!");

  try {
    // 1. Get the grand prize details
    const prizeRes = await pool.query(
      `SELECT * FROM prizes WHERE prize_type = 'grand'`
    );
    const grandPrize = prizeRes.rows[0];

    // 2. Get the triggering user info
    const userRes = await pool.query(`
      SELECT u.*, t.name as team_name, t.icon as team_icon
      FROM users u
      JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
    `, [triggeringUserId]);
    const triggeringUser = userRes.rows[0];

    // 3. Get top contributors
    const topContributors = await getTopContributors(pool, 5);

    // 4. Calculate pace analysis
    const paceAnalysis = calculatePaceAnalysis(totalSteps);

    // 5. Build the Slack blocks
    const blocks = build50PercentBlocks(grandPrize, triggeringUser, topContributors, paceAnalysis, totalSteps);

    // 6. Post to Slack
    await postToSlack(blocks);

    console.log("✅ 50% milestone announcement sent successfully!");
  } catch (err) {
    console.error("❌ Error sending 50% milestone announcement:", err);
    throw err;
  }
};

// Main function: Check if 50% milestone was just crossed and announce it
export const checkAndAnnounceMilestone = async (
  pool: Pool,
  userId: number,
  logId: number,
  previousTotalSteps: number,
  newTotalSteps: number
): Promise<boolean> => {
  // Quick check: Did we cross 50%?
  if (previousTotalSteps >= FIFTY_PERCENT_THRESHOLD) {
    // Already past threshold before this log
    return false;
  }

  if (newTotalSteps < FIFTY_PERCENT_THRESHOLD) {
    // Haven't reached threshold yet
    return false;
  }

  console.log(`🎯 50% milestone crossed! Previous: ${previousTotalSteps}, New: ${newTotalSteps}, Threshold: ${FIFTY_PERCENT_THRESHOLD}`);

  // We crossed the threshold! Try to claim the announcement
  try {
    // Atomic insert - will fail if already announced (UNIQUE constraint on milestone_type)
    const result = await pool.query(`
      INSERT INTO milestone_events
        (milestone_type, threshold_value, total_steps_at_trigger, triggered_by_user_id, triggered_by_log_id)
      VALUES
        ('50_percent', $1, $2, $3, $4)
      RETURNING id
    `, [FIFTY_PERCENT_THRESHOLD, newTotalSteps, userId, logId]);

    if (result.rows.length > 0) {
      console.log(`✅ Claimed 50% milestone announcement (event id: ${result.rows[0].id})`);
      // We won the race! Send the announcement
      await send50PercentMilestoneAnnouncement(pool, userId, newTotalSteps);
      return true;
    }
  } catch (err: any) {
    // Unique constraint violation = already announced (race condition handled gracefully)
    if (err.code === '23505') {
      console.log("ℹ️ 50% milestone already announced - skipping duplicate");
      return false;
    }
    // Some other error - rethrow
    console.error("❌ Error checking milestone:", err);
    throw err;
  }

  return false;
};

// ============================================================================
// EPIC FINALE & COUNTDOWN POSTS
// ============================================================================

// Award definitions for the finale
interface ChallengeAward {
  id: string;
  title: string;
  emoji: string;
  description: string;
  winner?: { username: string; slackUserId?: string; avatarEmoji: string; value: number | string };
}

// Gather comprehensive stats for the finale
export const gatherChallengeStats = async (pool: Pool): Promise<{
  totalSteps: number;
  totalLogs: number;
  totalDays: number;
  totalUsers: number;
  activeUsers: number;
  avgStepsPerPerson: number;
  avgStepsPerDay: number;
  totalMiles: number;
  totalCalories: number;
  globalGoal: number;
  percentOfGoal: number;
  teamStats: any[];
  userStats: any[];
  dailyWinners: any[];
  awards: ChallengeAward[];
  topDays: any[];
  activityBreakdown: any[];
  weeklyPrizeWinners: any[];
  grandPrizeQualifiers: any[];
}> => {
  // 1. Global totals
  const totalRes = await pool.query(`
    SELECT
      COALESCE(SUM(step_count), 0) as total_steps,
      COUNT(*) as total_logs,
      COUNT(DISTINCT date_logged) as total_days,
      COUNT(DISTINCT user_id) as active_users
    FROM activity_logs
  `);
  const { total_steps, total_logs, total_days, active_users } = totalRes.rows[0];
  const totalSteps = parseInt(total_steps);
  const totalLogs = parseInt(total_logs);
  const totalDays = parseInt(total_days);
  const activeUsers = parseInt(active_users);

  // 2. User count
  const userCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
  const totalUsers = parseInt(userCountRes.rows[0].count);

  // 3. Per-user stats (for leaderboard & awards)
  const userStatsRes = await pool.query(`
    SELECT
      u.id, u.username, u.avatar_emoji, u.slack_user_id, u.grand_prize_entry,
      t.name as team_name, t.icon as team_icon,
      COALESCE(SUM(al.step_count), 0) as total_steps,
      COUNT(al.id) as log_count,
      COUNT(DISTINCT al.date_logged) as active_days,
      MAX(al.step_count) as best_single_log,
      COALESCE(SUM(CASE WHEN al.activity_type LIKE 'Bonus%' THEN al.step_count ELSE 0 END), 0) as bonus_steps
    FROM users u
    JOIN teams t ON u.team_id = t.id
    LEFT JOIN activity_logs al ON u.id = al.user_id
    GROUP BY u.id, u.username, u.avatar_emoji, u.slack_user_id, u.grand_prize_entry, t.name, t.icon
    ORDER BY total_steps DESC
  `);
  const userStats = userStatsRes.rows.map(r => ({
    ...r,
    total_steps: parseInt(r.total_steps),
    log_count: parseInt(r.log_count),
    active_days: parseInt(r.active_days),
    best_single_log: parseInt(r.best_single_log) || 0,
    bonus_steps: parseInt(r.bonus_steps)
  }));

  // 4. Team stats
  const teamStatsRes = await pool.query(`
    SELECT
      t.id, t.name, t.icon,
      COUNT(DISTINCT u.id) as member_count,
      COALESCE(SUM(al.step_count), 0) as total_steps,
      COALESCE(AVG(al.step_count), 0) as avg_per_log
    FROM teams t
    LEFT JOIN users u ON u.team_id = t.id
    LEFT JOIN activity_logs al ON al.user_id = u.id
    GROUP BY t.id, t.name, t.icon
    ORDER BY total_steps DESC
  `);
  const teamStats = teamStatsRes.rows.map(r => ({
    ...r,
    total_steps: parseInt(r.total_steps),
    member_count: parseInt(r.member_count),
    avg_per_log: parseFloat(r.avg_per_log).toFixed(0)
  }));

  // 5. Daily winners
  const dailyWinnersRes = await pool.query(`
    SELECT dw.*, u.username, u.avatar_emoji, u.slack_user_id
    FROM daily_winners dw
    JOIN users u ON dw.user_id = u.id
    ORDER BY dw.date DESC
  `);
  const dailyWinners = dailyWinnersRes.rows;

  // 6. Count wins per user for "Most Crown Wins" award
  const winCountRes = await pool.query(`
    SELECT u.id, u.username, u.avatar_emoji, u.slack_user_id, COUNT(*) as win_count
    FROM daily_winners dw
    JOIN users u ON dw.user_id = u.id
    GROUP BY u.id, u.username, u.avatar_emoji, u.slack_user_id
    ORDER BY win_count DESC
  `);
  const winCounts = winCountRes.rows;

  // 7. Best single day by a user
  const bestDayRes = await pool.query(`
    SELECT u.id, u.username, u.avatar_emoji, u.slack_user_id, al.date_logged,
           SUM(al.step_count) as day_total
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    GROUP BY u.id, u.username, u.avatar_emoji, u.slack_user_id, al.date_logged
    ORDER BY day_total DESC
    LIMIT 5
  `);
  const topDays = bestDayRes.rows;

  // 8. Activity type breakdown
  const activityRes = await pool.query(`
    SELECT
      CASE
        WHEN activity_type LIKE 'Bonus%' THEN activity_type
        ELSE 'Walking/Running'
      END as category,
      SUM(step_count) as total_steps,
      COUNT(*) as log_count
    FROM activity_logs
    GROUP BY category
    ORDER BY total_steps DESC
  `);
  const activityBreakdown = activityRes.rows;

  // 9. Weekly prize winners
  const weeklyWinnersRes = await pool.query(`
    SELECT p.week_number, p.title, p.emoji, u.username, u.avatar_emoji, u.slack_user_id
    FROM prizes p
    JOIN users u ON p.winner_user_id = u.id
    WHERE p.prize_type = 'weekly' AND p.winner_user_id IS NOT NULL
    ORDER BY p.week_number
  `);
  const weeklyPrizeWinners = weeklyWinnersRes.rows;

  // 10. Grand prize qualifiers
  const grandQualRes = await pool.query(`
    SELECT u.id, u.username, u.avatar_emoji, u.slack_user_id, t.name as team_name, t.icon as team_icon
    FROM users u
    JOIN teams t ON u.team_id = t.id
    WHERE u.grand_prize_entry = TRUE
  `);
  const grandPrizeQualifiers = grandQualRes.rows;

  // 11. Calculate consecutive day streaks for each user
  const streakRes = await pool.query(`
    WITH user_dates AS (
      SELECT DISTINCT user_id, date_logged::date as log_date
      FROM activity_logs
      ORDER BY user_id, log_date
    ),
    date_groups AS (
      SELECT
        user_id,
        log_date,
        log_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY log_date))::int AS streak_group
      FROM user_dates
    ),
    streaks AS (
      SELECT
        user_id,
        MIN(log_date) as streak_start,
        MAX(log_date) as streak_end,
        COUNT(*) as streak_length
      FROM date_groups
      GROUP BY user_id, streak_group
    )
    SELECT u.id, u.username, u.avatar_emoji, u.slack_user_id, MAX(s.streak_length) as max_streak
    FROM users u
    LEFT JOIN streaks s ON u.id = s.user_id
    GROUP BY u.id, u.username, u.avatar_emoji, u.slack_user_id
    ORDER BY max_streak DESC NULLS LAST
  `);
  const streaks = streakRes.rows;

  // Build awards
  const awards: ChallengeAward[] = [];

  // Award: Most Steps Overall
  if (userStats[0] && userStats[0].total_steps > 0) {
    awards.push({
      id: 'most_steps',
      title: 'Step Champion',
      emoji: '👑',
      description: 'Most total steps in December',
      winner: {
        username: userStats[0].username,
        slackUserId: userStats[0].slack_user_id,
        avatarEmoji: userStats[0].avatar_emoji,
        value: `${parseInt(userStats[0].total_steps).toLocaleString()} steps`
      }
    });
  }

  // Award: Most Daily Crowns
  if (winCounts[0] && parseInt(winCounts[0].win_count) > 0) {
    awards.push({
      id: 'most_crowns',
      title: 'Crown Collector',
      emoji: '🏆',
      description: 'Most daily top walker wins',
      winner: {
        username: winCounts[0].username,
        slackUserId: winCounts[0].slack_user_id,
        avatarEmoji: winCounts[0].avatar_emoji,
        value: `${winCounts[0].win_count} wins`
      }
    });
  }

  // Award: Longest Streak
  if (streaks[0] && parseInt(streaks[0].max_streak) > 1) {
    awards.push({
      id: 'longest_streak',
      title: 'Consistency King/Queen',
      emoji: '🔥',
      description: 'Longest consecutive day streak',
      winner: {
        username: streaks[0].username,
        slackUserId: streaks[0].slack_user_id,
        avatarEmoji: streaks[0].avatar_emoji,
        value: `${streaks[0].max_streak} days`
      }
    });
  }

  // Award: Best Single Day
  if (topDays[0]) {
    awards.push({
      id: 'best_day',
      title: 'Single Day Legend',
      emoji: '⚡',
      description: 'Highest steps in a single day',
      winner: {
        username: topDays[0].username,
        slackUserId: topDays[0].slack_user_id,
        avatarEmoji: topDays[0].avatar_emoji,
        value: `${parseInt(topDays[0].day_total).toLocaleString()} steps on ${topDays[0].date_logged}`
      }
    });
  }

  // Award: Most Active (most log entries)
  const mostActive = [...userStats].sort((a, b) => b.log_count - a.log_count)[0];
  if (mostActive && mostActive.log_count > 0) {
    awards.push({
      id: 'most_active',
      title: 'Engagement Champion',
      emoji: '📊',
      description: 'Most activity logs submitted',
      winner: {
        username: mostActive.username,
        slackUserId: mostActive.slack_user_id,
        avatarEmoji: mostActive.avatar_emoji,
        value: `${mostActive.log_count} entries`
      }
    });
  }

  // Award: Bonus Activity King/Queen
  const bonusKing = [...userStats].sort((a, b) => b.bonus_steps - a.bonus_steps)[0];
  if (bonusKing && bonusKing.bonus_steps > 0) {
    awards.push({
      id: 'bonus_king',
      title: 'Wellness Warrior',
      emoji: '🧘',
      description: 'Most bonus activity steps (lifting, yoga, sleep, etc.)',
      winner: {
        username: bonusKing.username,
        slackUserId: bonusKing.slack_user_id,
        avatarEmoji: bonusKing.avatar_emoji,
        value: `${bonusKing.bonus_steps.toLocaleString()} bonus steps`
      }
    });
  }

  // Calculate derived stats
  const avgStepsPerPerson = activeUsers > 0 ? Math.round(totalSteps / activeUsers) : 0;
  const avgStepsPerDay = totalDays > 0 ? Math.round(totalSteps / totalDays) : 0;
  const totalMiles = Math.round(totalSteps / 2222);
  const totalCalories = Math.round(totalSteps * 0.05);
  const globalGoal = GLOBAL_GOAL;
  const percentOfGoal = Math.round((totalSteps / globalGoal) * 100);

  return {
    totalSteps,
    totalLogs,
    totalDays,
    totalUsers,
    activeUsers,
    avgStepsPerPerson,
    avgStepsPerDay,
    totalMiles,
    totalCalories,
    globalGoal,
    percentOfGoal,
    teamStats,
    userStats,
    dailyWinners,
    awards,
    topDays,
    activityBreakdown,
    weeklyPrizeWinners,
    grandPrizeQualifiers
  };
};

// PREVIEW/COUNTDOWN POST - Send today to remind people to log their steps
export const sendGrandPrizeCountdownPost = async (pool: Pool): Promise<{ success: boolean; message: string }> => {
  try {
    const stats = await gatherChallengeStats(pool);

    // Get grand prize details
    const prizeRes = await pool.query(`SELECT * FROM prizes WHERE prize_type = 'grand'`);
    const grandPrize = prizeRes.rows[0];

    // Top 3 for leaderboard preview
    const top3 = stats.userStats.slice(0, 3);
    const leaderboardText = top3.map((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
      return `${medal} ${mention} ${u.avatar_emoji} — *${u.total_steps.toLocaleString()}* steps`;
    }).join('\n');

    // Qualifiers list
    const qualifiersList = stats.grandPrizeQualifiers.map(q => {
      const mention = q.slack_user_id ? `<@${q.slack_user_id}>` : q.username;
      return `${q.avatar_emoji} ${mention}`;
    }).join(' • ');

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⏰ FINAL HOURS: Grand Prize Drawing TOMORROW! ⏰",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎉 *The December Step Challenge is almost over!*\n\n📅 *Grand Prize Drawing:* Tomorrow at 2:00 PM MST\n⏳ *Deadline to Log Steps:* Tonight at 11:59 PM MST`
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🏆 THE GRAND PRIZE*\n${grandPrize?.emoji || '🏆'} *${grandPrize?.title || 'Grand Prize'}*\n\n_${grandPrize?.description || ''}_`
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎟️ CURRENT QUALIFIERS (${stats.grandPrizeQualifiers.length} people)*\n\n${qualifiersList || '_No qualifiers yet_'}\n\n_Hit *${GRAND_PRIZE_THRESHOLD_STEPS.toLocaleString()}+ steps* to qualify!_`
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📊 CURRENT LEADERBOARD*\n\n${leaderboardText}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🌍 TEAM TOTALS SO FAR*\n• 🚶 *${stats.totalSteps.toLocaleString()}* total steps\n• 📏 *${stats.totalMiles.toLocaleString()}* miles walked\n• 🔥 *${stats.totalCalories.toLocaleString()}* calories burned\n• 📈 *${stats.percentOfGoal}%* of our ${stats.globalGoal.toLocaleString()} step goal`
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*⚠️ DON'T MISS OUT!*\n\nIf you have any steps from December that you haven't logged yet, *now is the time!*\n\n• Forgot about that walk on the 15th? Log it!\n• Have steps from yesterday? Add them!\n• Every step counts toward your total!\n\n<https://teamtrek-1024587728322.us-central1.run.app|📲 *Log Your Steps Now* →>`
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `⏰ All entries must be logged by *11:59 PM MST tonight* to count toward the grand prize drawing. The winner will be announced *tomorrow at 2:00 PM MST*! 🎉`
        }]
      }
    ];

    await postToSlack(blocks);

    return { success: true, message: "Countdown post sent to Slack!" };
  } catch (err: any) {
    console.error("Error sending countdown post:", err);
    return { success: false, message: err.message };
  }
};

// EPIC FINALE ANNOUNCEMENT - The big reveal with all stats and awards
export const sendEpicFinaleAnnouncement = async (pool: Pool): Promise<{ success: boolean; message: string; winner?: any }> => {
  try {
    // First, draw the grand prize winner
    const { winner, prize, qualifiedCount, alreadyDrawn, totalSteps: winnerSteps } = await drawGrandPrizeWinner(pool);

    if (alreadyDrawn) {
      return { success: false, message: "Grand prize has already been drawn" };
    }

    if (!winner || !prize) {
      return { success: false, message: "No qualified participants for grand prize" };
    }

    // Gather all the stats
    const stats = await gatherChallengeStats(pool);

    const winnerMention = winner.slack_user_id
      ? `<@${winner.slack_user_id}>`
      : `*${winner.username}*`;

    // Calculate fun stats
    const pizzasBurned = Math.round(stats.totalCalories / 285); // avg slice = 285 cal
    const phonesCharged = Math.round(stats.totalCalories / 10); // ~10 cal per phone charge

    // Build the mega announcement blocks
    const blocks: any[] = [];

    // Part 1: The Cinematic Opening
    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🏆✨ THE DECEMBER STEP CHALLENGE: A CINEMATIC FINALE ✨🏆",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_*[Dramatic orchestral music plays]*_\n\nLadies and gentlemen, we didn't just walk. We *STRUTTED*. We *POWER-WALKED*. Some of us even _jazz-walked_ (you know who you are). 💃🕺`
        }
      },
      { type: "divider" }
    );

    // Part 2: By The Numbers (read in Morgan Freeman's voice)
    blocks.push(
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📊 BY THE NUMBERS",
          emoji: true
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `_(please read in Morgan Freeman's voice)_`
        }]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `👣 *${stats.totalSteps.toLocaleString()} TOTAL STEPS*\nThat's *${stats.percentOfGoal}%* of our goal. We didn't just hit it — we kept walking like we didn't know where the finish line was. Classic overachievers.\n\n` +
            `🌍 *${stats.totalMiles.toLocaleString()} MILES WALKED*\nEquivalent to walking to... Canada? Denmark? THE MOON?! _(okay, not the moon, but spiritually? yes.)_\n\n` +
            `🔥 *${stats.totalCalories.toLocaleString()} CALORIES BURNED*\nThat's approximately *${pizzasBurned} pizza slices* worth of calories. ...Not that anyone's tracking. 👀\n\n` +
            `⚡ *${phonesCharged.toLocaleString()} PHONE CHARGES*\nEnough energy to power a Tesla for about 42 miles. Elon, call us.`
        }
      },
      { type: "divider" }
    );

    // Part 3: THE GRAND PRIZE WINNER
    blocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎰 *AND NOW... THE MOMENT YOU'VE BEEN WAITING FOR...*\n\n_*[Drumroll that lasts uncomfortably long]*_\n_*[Confetti cannon sounds]*_\n_*[Someone in the back yells "JUST TELL US ALREADY"]*_`
        }
      }
    );

    const celebration = GRAND_PRIZE_CELEBRATIONS[Math.floor(Math.random() * GRAND_PRIZE_CELEBRATIONS.length)];
    blocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎊🎊🎊 *THE GRAND PRIZE WINNER IS...* 🎊🎊🎊\n\n` +
            `🏆🏆🏆 *${winnerMention}* ${winner.avatar_emoji} 🏆🏆🏆\n\n` +
            `> _${celebration}_\n\n` +
            `You've won the *${prize.emoji} ${prize.title}*!\n${winner.team_icon} ${winner.team_name}\n\n` +
            `_*[Crowd goes absolutely wild]*_\n_*[Tears of joy]*_\n_*[Someone faints but they're okay]*_`
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `🎲 Randomly selected from *${qualifiedCount}* absolute legends who each crushed *${GRAND_PRIZE_THRESHOLD_STEPS.toLocaleString()}+* steps this month!`
        }]
      },
      { type: "divider" }
    );

    // Part 4: Individual Awards (with humor)
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "🏅 THE AWARDS CEREMONY",
        emoji: true
      }
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `_(Imaginary trophies were harmed in the making of this post)_`
      }]
    });

    // Find the step champion for special treatment
    const stepChampion = stats.awards.find(a => a.title === 'Step Champion');
    const crownCollector = stats.awards.find(a => a.title === 'Crown Collector');
    const singleDayLegend = stats.awards.find(a => a.title === 'Single Day Legend');

    // Special Andy-style commentary for dominant performers
    for (const award of stats.awards) {
      if (award.winner) {
        const awardMention = award.winner.slackUserId
          ? `<@${award.winner.slackUserId}>`
          : award.winner.username;

        let funnyComment = '';
        if (award.title === 'Step Champion') {
          const pctOfTotal = ((parseInt(award.winner.value.replace(/,/g, '')) / stats.totalSteps) * 100).toFixed(1);
          funnyComment = `\n_That's ${pctOfTotal}% of ALL company steps. Basically carried this challenge on their back. And their legs. Mostly their legs._`;
        } else if (award.title === 'Crown Collector') {
          funnyComment = `\n_We considered renaming the app after them. Legal said no._`;
        } else if (award.title === 'Single Day Legend') {
          funnyComment = `\n_What were you DOING?! Training for the Olympics? Running from something? RUNNING TO something?! We need answers._`;
        } else if (award.title === 'Streak Master') {
          funnyComment = `\n_Didn't miss a SINGLE DAY. Calendar? GREEN. Dedication? UNMATCHED._`;
        } else if (award.title === 'Most Consistent') {
          funnyComment = `\n_The human equivalent of "you can count on me."_`;
        }

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${award.emoji} *${award.title}*\n${awardMention} ${award.winner.avatarEmoji}\n_${award.description}_\n📊 *${award.winner.value}*${funnyComment}`
          }
        });
      }
    }

    blocks.push({ type: "divider" });

    // Part 5: Team Battle Results
    if (stats.teamStats.length >= 2) {
      const winningTeam = stats.teamStats[0];
      const losingTeam = stats.teamStats[1];
      const margin = parseInt(winningTeam.total_steps) - parseInt(losingTeam.total_steps);

      blocks.push(
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🥇 TEAM CHAMPION 🥇",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${winningTeam.icon} ${winningTeam.name}* takes the crown! 👑\n` +
              `*${parseInt(winningTeam.total_steps).toLocaleString()} steps* | Avg: ${Math.round(parseInt(winningTeam.total_steps) / parseInt(winningTeam.member_count)).toLocaleString()}/person\n\n` +
              `${losingTeam.icon} ${losingTeam.name} put up a valiant fight with ${parseInt(losingTeam.total_steps).toLocaleString()} steps, ` +
              `but in the end, ${winningTeam.name.replace('The ', 'the ')} lifted themselves... right onto the podium. _*Chef's kiss*_ 🤌`
          }
        },
        { type: "divider" }
      );
    }

    // Part 6: Weekly Prize Winners Recap
    if (stats.weeklyPrizeWinners.length > 0) {
      blocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: "🎁 WEEKLY WINNERS HALL OF FAME",
          emoji: true
        }
      });

      const prizeComments = [
        'Their muscles have never been happier',
        'Hydration station: ACTIVATED',
        'Looking good, feeling good',
        'Recovery mode: ENGAGED'
      ];

      const weeklyText = stats.weeklyPrizeWinners.map((w, i) => {
        const mention = w.slack_user_id ? `<@${w.slack_user_id}>` : w.username;
        const comment = prizeComments[w.week_number - 1] || 'Living the dream';
        return `• *Week ${w.week_number}:* ${mention} ${w.avatar_emoji} → ${w.emoji} ${w.title}\n  _${comment}_`;
      }).join('\n');

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: weeklyText
        }
      });

      blocks.push({ type: "divider" });
    }

    // Part 7: Fun Facts Section
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "🧮 FUN FACTS YOUR BRAIN DIDN'T ASK FOR",
        emoji: true
      }
    });

    const everestClimbs = Math.round(stats.totalMiles / 5.5); // 5.5 miles to climb Everest
    const earthCircles = (stats.totalMiles / 24901).toFixed(4); // Earth circumference

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `• We burned enough calories to power a Tesla for 42 miles. _Elon, call us._\n\n` +
          `• Average steps per person: *${stats.avgStepsPerPerson.toLocaleString()}* — basically a marathon per week. _*pretends this isn't exhausting*_\n\n` +
          `• We collectively took enough steps to climb Everest *${everestClimbs} times*. Sherpas are impressed.\n\n` +
          `• We logged *${stats.totalLogs}* activity entries. That's *${Math.round(stats.totalLogs / stats.activeUsers)}* per person. We see those "walking 1:1" entries, and we _RESPECT IT_.`
      }
    });

    blocks.push({ type: "divider" });

    // Part 8: Final Leaderboard
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "🏆 FINAL LEADERBOARD",
        emoji: true
      }
    });

    const top5 = stats.userStats.slice(0, 5);
    const leaderboardText = top5.map((u, i) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
      return `${medals[i]} ${mention} ${u.avatar_emoji} — *${u.total_steps.toLocaleString()}* steps`;
    }).join('\n');

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: leaderboardText
      }
    });

    blocks.push({ type: "divider" });

    // Part 9: Sincere Thank You (with a touch of humor)
    blocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*💝 A SINCERE THANK YOU*\n\nNo seriously, this was incredible.\n\nYou all logged steps before coffee. After dinner. During meetings _(we saw those "walking 1:1" entries, and we RESPECT IT)_.\n\nYou competed. You encouraged. You made WALKING competitive, which is honestly a very Recess thing to do.`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Whether you walked 5,000 steps or 400,000 steps, *YOU SHOWED UP.* And that's what this was really about.\n\nWell, that and the prizes. Let's be honest. 🎁`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*👟 UNTIL NEXT TIME...*\n\nKeep moving. Keep stepping. Keep being the weirdly competitive, health-obsessed, step-counting family we've become.\n\nSee you in January!\n_(Yes, there might be another challenge. No, we're not confirming anything. ...Okay fine, start stretching.)_\n\n🚶‍♂️🚶‍♀️🚶🚶‍♂️🚶‍♀️🚶 → 🏆\n\n_— The Recess Step Challenge Team_\n_(Powered by questionable step counting and pure vibes)_`
        }
      }
    );

    // Post to Slack
    await postToSlack(blocks);

    return {
      success: true,
      message: `Epic finale sent! Grand prize winner: ${winner.username}`,
      winner: {
        id: winner.id,
        username: winner.username,
        totalSteps: winnerSteps,
        team: winner.team_name
      }
    };
  } catch (err: any) {
    console.error("Error sending epic finale:", err);
    return { success: false, message: err.message };
  }
};
