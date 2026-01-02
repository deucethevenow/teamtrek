import { GoogleGenerativeAI } from "@google/generative-ai";

let ai: GoogleGenerativeAI | null = null;

// Initialize safely
try {
  // Check if process is defined (Node environment) before accessing process.env
  // In browser environments without polyfills, accessing process might throw
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    ai = new GoogleGenerativeAI(process.env.API_KEY);
  }
} catch (error) {
  console.warn("Gemini API Key not found or invalid.");
}

export const getHealthTip = async (currentSteps: number): Promise<string> => {
  if (!ai) {
    // Fallback if no API key
    const fallbacks = [
      "Drink water before your coffee! 💧",
      "Taking the stairs counts as double cardio! 🏃‍♂️",
      "A 10-minute walk boosts creativity by 60%. 🧠",
      "Stand up and stretch every hour to keep blood flowing. 🤸"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Generate a short, witty, and motivating health tip (max 1 sentence) for a corporate employee
      who has walked ${currentSteps} steps today.
      If steps are low (<2000), be encouraging.
      If steps are high (>8000), be congratulatory.
      Include an emoji.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Keep moving forward, one step at a time! 👣";
  }
};

export const getDailyFunFact = async (todaySteps: number, totalSteps: number, leadingTeamName: string): Promise<string> => {
  if (!ai) {
    // Fallback fun facts
    const fallbacks = [
      "🌎 Walking 10,000 steps is roughly 5 miles - that's like walking from Central Park to Times Square!",
      "🧠 Studies show that walking meetings boost creativity by 60% compared to sitting!",
      "💪 Your heart beats about 100,000 times a day - keep it strong with those steps!",
      "🦴 Walking strengthens bones and can reduce the risk of osteoporosis by up to 40%!",
      "🌟 Every 2,000 steps you take burns about 100 calories - you're a calorie-crushing machine!",
      "🚀 If you walk 10,000 steps a day for a year, you'll have walked about 1,825 miles!",
      "🏆 The average person takes 4,000-6,000 steps per day. You're crushing the average!"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Generate ONE fun, witty, or surprising fact or stat about today's team walking activity.

      Context:
      - Today the team logged ${todaySteps.toLocaleString()} steps collectively
      - Total lifetime steps: ${totalSteps.toLocaleString()}
      - Leading team: ${leadingTeamName}

      Make it:
      - Short (1-2 sentences max)
      - Unexpected or surprising comparison (e.g., "That's enough to walk from NYC to Boston!")
      - Celebratory and positive
      - Include ONE relevant emoji
      - Make it relatable and fun

      Examples:
      - "🌍 Today's ${todaySteps.toLocaleString()} steps could walk you across the Golden Gate Bridge 3 times!"
      - "🚀 Your collective steps today would climb Mount Everest and back down again!"
      - "🍕 You've burned enough calories today to enjoy 23 slices of pizza guilt-free!"

      Return ONLY the fun fact, nothing else.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "🌟 Every step you take makes a difference! Keep up the amazing work!";
  }
};

export const getMorningMotivation = async (winnerName: string, winnerSteps: number, totalWins: number): Promise<string> => {
  if (!ai) {
    // Fallback motivations
    const fallbacks = [
      `${winnerName} showed us what determination looks like! Today's crown is up for grabs - who's taking it? 👑`,
      `Congrats to ${winnerName} for yesterday's epic performance! The competition is heating up! 🔥`,
      `${winnerSteps.toLocaleString()} steps is no joke! Can anyone match that energy today? 💪`,
      `${winnerName} is on fire! But remember - every day is a new chance to claim the crown! ✨`,
      `Yesterday's winner: ${winnerName}. Today's champion: Could be YOU! Let's go! 🚀`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Generate a short, energizing morning motivation message for a team step challenge.

      Context:
      - Yesterday's top walker: ${winnerName}
      - Their step count: ${winnerSteps.toLocaleString()} steps
      - Total daily wins for this person: ${totalWins}

      Make it:
      - 1-2 sentences max
      - Celebratory of the winner but also motivating for everyone else
      - Playful and competitive in a friendly way
      - Include ONE emoji at the start or end
      ${totalWins > 1 ? `- Mention they're on a winning streak (${totalWins} wins!)` : '- Mention it was their first win'}

      Examples of good tone:
      - "${winnerName} is building a dynasty! But dynasties can fall... Who's stepping up today? 👑"
      - "That's ${totalWins} crowns for ${winnerName}! The throne is getting warm - time to cool it down! 🔥"

      Return ONLY the motivation message, nothing else.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `${winnerName} crushed it yesterday! Today's crown is up for grabs - let's see who wants it! 🏆`;
  }
};