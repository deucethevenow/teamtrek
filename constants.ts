
import { Team, Badge, DailyQuest } from './types';

export const APP_NAME = "recess";
export const DAILY_GOAL = 7000;
export const DAYS_IN_MONTH = 31;

// December Calculation: 10 Users * 7,000 steps * 31 Days = 2,170,000
export const GLOBAL_GOAL = 10 * DAILY_GOAL * DAYS_IN_MONTH; 

// Team Goal: The average steps per member needed to have a "perfect month"
// 7k * 31 days = 217,000 steps per person
export const TEAM_AVG_GOAL = DAILY_GOAL * DAYS_IN_MONTH;

// Weekly Logic
export const WEEKLY_GOAL = DAILY_GOAL * 7; // 49,000
export const RAFFLE_THRESHOLD_PCT = 0.6; // 60%
export const RAFFLE_THRESHOLD_STEPS = WEEKLY_GOAL * RAFFLE_THRESHOLD_PCT; 

// Grand Prize Logic (Monthly)
export const MONTHLY_INDIVIDUAL_GOAL = DAILY_GOAL * DAYS_IN_MONTH;
export const GRAND_PRIZE_THRESHOLD_PCT = 0.7; // 70%
export const GRAND_PRIZE_THRESHOLD_STEPS = MONTHLY_INDIVIDUAL_GOAL * GRAND_PRIZE_THRESHOLD_PCT;

export const INITIAL_TEAMS: Team[] = [
  { id: 1, name: "The Cloud Walkers", color_hex: "from-cyan-400 to-blue-500", icon: "☁️" },
  { id: 2, name: "The Mood Lifters", color_hex: "from-orange-300 to-pink-400", icon: "✨" },
];

export const INITIAL_USERS = [
  // Team 1
  { id: 1, username: "Pam", team_id: 1, avatar_emoji: "🧘‍♀️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  { id: 2, username: "Victoria", team_id: 1, avatar_emoji: "🏃‍♀️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  { id: 3, username: "Jack", team_id: 1, avatar_emoji: "🧗‍♂️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  { id: 4, username: "Francisco", team_id: 1, avatar_emoji: "🚴‍♂️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  
  // Team 2
  { id: 5, username: "Claire", team_id: 2, avatar_emoji: "🤸‍♀️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  { id: 6, username: "Deuce", team_id: 2, avatar_emoji: "🧢", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  { id: 7, username: "Courtney", team_id: 2, avatar_emoji: "🏄‍♀️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
  { id: 8, username: "Arb", team_id: 2, avatar_emoji: "🕶️", raffle_tickets: 0, grand_prize_entry: false, banked_steps: 0 },
];

export const MILESTONES = [
  { steps: 0, label: "Recess HQ" },
  { steps: 500000, label: "Blue Lagoon, Iceland" },
  { steps: 1000000, label: "Kyoto Bamboo Forest" },
  { steps: 1500000, label: "Machu Picchu" },
  { steps: 2000000, label: "Great Barrier Reef" },
  { steps: 2480000, label: "The Moon (Almost)" },
];

export const CONVERSION_RATES = {
    STEPS_PER_MILE: 2222, // 10,000 steps ≈ 4.5 miles (more accurate)
    STEPS_PER_MINUTE: 100, // Avg moderate walking pace
    STEPS_PER_CALORIE: 20, // Approx 1 cal per 20 steps
    CALORIES_PER_STEP: 0.05, // Inverse (updated)
    MINUTES_PER_STEP: 0.01 // Inverse (approx 100 steps per min)
};

export const BADGES: Badge[] = [
  { id: 'streak_3', label: 'On Fire', icon: '🔥', description: 'Hit goal 3 days in a row', earned: false },
  { id: 'hydration', label: 'Hydro Homie', icon: '💧', description: 'Logged water intake', earned: false },
  { id: 'early_bird', label: 'Early Bird', icon: '🌅', description: 'Steps before 8am', earned: false },
  { id: 'weekend', label: 'Weekend Warrior', icon: '🎉', description: 'Active on Saturday/Sunday', earned: false },
  { id: 'high_stepper', label: 'High Stepper', icon: '🚀', description: '15k steps in one day', earned: false },
  { id: 'daily_winner', label: 'Daily Champion', icon: '👑', description: 'Most steps in a single day', earned: false },
];

export const BONUS_ACTIVITIES = [
  { 
    type: 'Bonus: Lifting', 
    label: 'Lift / Weights', 
    steps: 1500, 
    description: 'Building strength increases bone density & metabolism.',
    icon: 'Dumbbell'
  },
  { 
    type: 'Bonus: Detox', 
    label: 'Digital Detox', 
    steps: 1200, 
    description: '< 2 hrs screen time. Disconnect to reconnect.',
    icon: 'SmartphoneOff' 
  },
  { 
    type: 'Bonus: Cold Plunge', 
    label: 'Cold Plunge', 
    steps: 1000, 
    description: 'Reduces inflammation and spikes dopamine.',
    icon: 'Snowflake' 
  },
  { 
    type: 'Bonus: Sauna', 
    label: 'Sauna Session', 
    steps: 800, 
    description: 'Activates heat shock proteins for recovery.',
    icon: 'ThermometerSun' 
  },
  { 
    type: 'Bonus: Stretch', 
    label: 'Yoga / Stretch', 
    steps: 750, 
    description: 'Improves flexibility and reduces cortisol.',
    icon: 'Move' 
  },
  { 
    type: 'Bonus: Sleep', 
    label: '8h Sleep', 
    steps: 500, 
    description: 'The ultimate performance enhancer.',
    icon: 'Moon' 
  },
  { 
    type: 'Bonus: Hydration', 
    label: 'Hydration', 
    steps: 300, 
    description: 'Drinking 8 glasses improves brain function.',
    icon: 'Droplets' 
  },
  { 
    type: 'Bonus: Gratitude', 
    label: 'Gratitude', 
    steps: 300, 
    description: 'Shift your mindset. Lowers stress instantly.',
    icon: 'HeartHandshake' 
  },
];

export const DAILY_QUESTS: DailyQuest[] = [
    { id: 'q1', label: 'The Lunch Lap', description: 'Log activity between 12pm and 2pm', icon: '🥪', targetValue: 2000 },
    { id: 'q2', label: 'Sunrise Stroll', description: 'Log activity before 9am', icon: '🌅', targetValue: 1000 },
    { id: 'q3', label: 'Power Hour', description: 'Log a single walk over 3,000 steps', icon: '⚡', targetValue: 3000 },
    { id: 'q4', label: 'Weekend Warrior', description: 'Log activity on Sat or Sun', icon: '🎉', targetValue: 5000 },
    { id: 'q5', label: 'Midweek Motivation', description: 'Hit your goal on a Wednesday', icon: '🐫', targetValue: 7000 },
];

// --- Helper Functions ---

export const calculateMetrics = (steps: number) => {
    return {
        miles: (steps / CONVERSION_RATES.STEPS_PER_MILE).toFixed(2),
        calories: Math.round(steps * CONVERSION_RATES.CALORIES_PER_STEP),
        minutes: Math.round(steps * CONVERSION_RATES.MINUTES_PER_STEP)
    };
};

export const getFunInsight = (totalSteps: number) => {
    const miles = totalSteps / CONVERSION_RATES.STEPS_PER_MILE;

    // Cross-country and epic journey comparisons
    if (miles >= 2800) return "You've walked across the entire United States! 🇺🇸";
    if (miles >= 2100) return "You could walk from Los Angeles to New York! 🗽";
    if (miles >= 1500) return "You've walked the length of the Appalachian Trail! 🥾";
    if (miles >= 877) return "That's like walking from San Francisco to Seattle! 🌲";
    if (miles >= 500) return "You've walked the entire Camino de Santiago! ⛪";
    if (miles >= 300) return "You could walk from Boston to Washington DC! 🏛️";
    if (miles >= 240) return "You've walked past the ISS orbit height! 🛰️";
    if (miles >= 140) return "That's like walking from Denver to Colorado Springs and back! 🏔️";
    if (miles >= 100) return "You've walked from NYC to Philadelphia! 🥨";
    if (miles >= 50) return "You could walk across the Grand Canyon rim-to-rim 2 times! 🏜️";
    if (miles >= 26.2) return "You've completed a full marathon distance! 🏃";
    if (miles >= 13.1) return "That's a half marathon! Halfway to legendary! 🎯";
    if (miles >= 5) return "You've walked the height of Mount Everest! 🏔️";
    return "Every step is a step towards a better mood! ✨";
};

export const getDetailedImpact = (totalSteps: number) => {
    const calories = Math.round(totalSteps * CONVERSION_RATES.CALORIES_PER_STEP);
    
    // 1 lb of fat approx 3500 kcal
    const fatBurned = (calories / 3500).toFixed(2);
    
    // Avg burger approx 550 kcal
    const burgersBurned = (calories / 550).toFixed(1);
    
    // Charging a phone takes approx 12-15 Wh. 
    // 1 kcal = 1.16 Wh. So 1 kcal ~= 0.08 phone charges? 
    // Let's simplify: 100 calories can charge a phone about 8 times? 
    // Actually: iPhone battery ~12 Watt-hours. 1 kcal = 1.16 Wh. 
    // So ~10 kcal = 1 Phone Charge.
    const phoneCharges = Math.round(calories / 10);

    return [
        { label: "Fat Burned", value: `${fatBurned} lbs`, icon: "🔥", detail: "Based on 3500 cal rule" },
        { label: "Burgers", value: `${burgersBurned}`, icon: "🍔", detail: "Big Macs burned off" },
        { label: "Phone Charges", value: `${phoneCharges}`, icon: "⚡", detail: "Energy equivalent generated" }
    ];
};

export const getTodaysQuest = (): DailyQuest => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return DAILY_QUESTS[dayOfYear % DAILY_QUESTS.length];
};

export const getMoodAura = (steps: number) => {
    if (steps > 10000) return { color: "from-purple-500 to-pink-500", label: "Fire", glow: "shadow-pink-200 ring-pink-100" };
    if (steps > 7000) return { color: "from-orange-400 to-yellow-400", label: "Spark", glow: "shadow-orange-200 ring-orange-100" };
    if (steps > 3000) return { color: "from-teal-400 to-emerald-400", label: "Flow", glow: "shadow-teal-200 ring-teal-100" };
    return { color: "from-cyan-300 to-blue-300", label: "Chill", glow: "shadow-cyan-100 ring-cyan-50" };
};
