import { Team, User, ActivityLog, TeamStats, UserStats, DailyTeamStat, Badge, GlobalProgress } from '../types';
import { GLOBAL_GOAL, MILESTONES, DAILY_GOAL, BADGES, RAFFLE_THRESHOLD_STEPS, GRAND_PRIZE_THRESHOLD_STEPS, INITIAL_TEAMS, INITIAL_USERS } from '../constants';

// API BASE URL - In Replit/Production this is usually relative or configured
const API_URL = '/api';

// Helper: Get date string in Mountain Time (YYYY-MM-DD format)
// All date operations should use MT to match user activity and server timezone
const getMountainTimeDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
}; 

class DataService {
  
  // Internal storage for "Offline/Mock" mode
  private mockLogs: ActivityLog[] = [];
  private mockUsers: User[] = [...INITIAL_USERS];
  private isOnline: boolean = false;

  constructor() {
    // Try to check connection immediately
    this.checkConnection();
  }

  async checkConnection(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/teams`);
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            this.isOnline = true;
            return true;
        }
    } catch (e) {}
    this.isOnline = false;
    return false;
  }

  public getIsOnline(): boolean {
      return this.isOnline;
  }

  // --- API Helpers with Fallback ---

  private async fetchTeams(): Promise<Team[]> {
    try {
        const res = await fetch(`${API_URL}/teams`);
        if (!res.ok) throw new Error("API Error");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
        }
        this.isOnline = true;
        return await res.json();
    } catch (err) {
        console.warn("Backend unreachable, using static data for Teams.");
        this.isOnline = false;
        return INITIAL_TEAMS;
    }
  }

  private async fetchUsers(): Promise<User[]> {
    try {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error("API Error");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
        }
        this.isOnline = true;
        return await res.json();
    } catch (err) {
        console.warn("Backend unreachable, using static data for Users.");
        this.isOnline = false;
        return this.mockUsers; 
    }
  }

  private async fetchLogs(): Promise<ActivityLog[]> {
    try {
        const res = await fetch(`${API_URL}/logs`);
        if (!res.ok) throw new Error("API Error");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
        }
        const serverLogs = await res.json();
        this.isOnline = true;
        return serverLogs;
    } catch (err) {
        console.warn("Backend unreachable, returning session logs.");
        this.isOnline = false;
        return this.mockLogs;
    }
  }

  // --- Auth ---

  async loginById(userId: number): Promise<User> {
    const users = await this.fetchUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    return user;
  }

  // --- Actions ---

  async logActivity(userId: number, steps: number, type: string, customDate?: string): Promise<void> {
    // Use Mountain Time for default date (matches server and when users are active)
    const dateStr = customDate || getMountainTimeDate();

    // 1. Try Server
    try {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          step_count: steps,
          activity_type: type,
          date_logged: dateStr
        })
      });
      if (!res.ok) throw new Error("Failed to save log to server");
      this.isOnline = true;
    } catch (err) {
        console.warn("Backend save failed. Saving locally for session.", err);
        this.isOnline = false;
        // 2. Fallback: Save Locally
        const newLog: ActivityLog = {
            id: Math.random(), // Temporary ID
            user_id: userId,
            step_count: steps,
            activity_type: type as any,
            date_logged: dateStr
        };
        this.mockLogs.push(newLog);
        
        // Update local user cache if needed
        const uIndex = this.mockUsers.findIndex(u => u.id === userId);
        if (uIndex > -1) {
            this.mockUsers[uIndex].banked_steps += steps;
        }
    }
  }

  async enterWeeklyRaffle(userId: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/users/${userId}/raffle`, { method: 'POST' });
        if(!res.ok) throw new Error("API Fail");
        this.isOnline = true;
        return true;
    } catch (err) {
        console.warn("Backend fail. Updating local state.");
        this.isOnline = false;
        const u = this.mockUsers.find(u => u.id === userId);
        if (u) u.raffle_tickets = 1;
        return true;
    }
  }

  async enterGrandPrize(userId: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/users/${userId}/grandprize`, { method: 'POST' });
        if(!res.ok) throw new Error("API Fail");
        this.isOnline = true;
        return true;
    } catch (err) {
        console.warn("Backend fail. Updating local state.");
        this.isOnline = false;
        const u = this.mockUsers.find(u => u.id === userId);
        if (u) u.grand_prize_entry = true;
        return true;
    }
  }

  // --- Data Getters ---

  async getAllTeams(): Promise<Team[]> {
    return this.fetchTeams();
  }

  async getAllUsers(): Promise<User[]> {
    return this.fetchUsers();
  }

  async getRaffleParticipants(): Promise<User[]> {
    try {
      // Calculate current challenge week (1-4)
      const CHALLENGE_START = new Date('2025-12-01T00:00:00-07:00');
      const today = new Date();
      const todayStr = getMountainTimeDate(today);
      const todayDate = new Date(todayStr + 'T12:00:00-07:00');
      const daysSinceStart = Math.floor(
        (todayDate.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24)
      );
      const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 4);

      // Fetch qualified entries for current week from prize_entries table
      const res = await fetch(`${API_URL}/prizes/${currentWeek}/entries`);
      if (!res.ok) throw new Error("API Error");
      const entries = await res.json();

      // Return only qualified, opted-in users as User objects
      return entries
        .filter((e: any) => e.qualified && e.opted_in)
        .map((e: any) => ({
          id: e.user_id,
          username: e.username,
          avatar_emoji: e.avatar_emoji,
          team_id: e.team_id,
          banked_steps: 0,
          raffle_tickets: 1, // For UI compatibility
          grand_prize_entry: false
        } as User));
    } catch (err) {
      console.warn("Failed to fetch raffle participants from prize_entries:", err);
      // Fallback to old method if API fails
      const users = await this.fetchUsers();
      return users.filter(u => u.raffle_tickets > 0);
    }
  }

  async getGrandPrizeParticipants(): Promise<User[]> {
    const users = await this.fetchUsers();
    return users.filter(u => u.grand_prize_entry);
  }

  async getWeeklySteps(userId: number): Promise<number> {
    const logs = await this.fetchLogs();

    // Challenge week boundaries (Dec 1, 2025 = Week 1 start, which is a Monday)
    const CHALLENGE_START = new Date('2025-12-01T00:00:00-07:00'); // MT timezone
    const today = new Date();
    const todayStr = getMountainTimeDate(today);
    const todayDate = new Date(todayStr + 'T12:00:00-07:00'); // Noon MT to avoid DST issues

    // Calculate current challenge week (1-4)
    const daysSinceStart = Math.floor(
      (todayDate.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 4);

    // Week start/end dates for current challenge week
    const weekStartDate = new Date(CHALLENGE_START);
    weekStartDate.setDate(weekStartDate.getDate() + (currentWeek - 1) * 7);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const weekStartStr = getMountainTimeDate(weekStartDate);
    const weekEndStr = getMountainTimeDate(weekEndDate);

    return logs
        .filter(l => {
            return l.user_id === userId &&
                   l.date_logged >= weekStartStr &&
                   l.date_logged <= weekEndStr;
        })
        .reduce((sum, l) => sum + l.step_count, 0);
  }

  async getTotalMonthSteps(userId: number): Promise<number> {
    const logs = await this.fetchLogs();
    return logs
        .filter(l => l.user_id === userId)
        .reduce((sum, l) => sum + l.step_count, 0);
  }

  async getTodaySteps(userId: number): Promise<number> {
    const logs = await this.fetchLogs();
    const today = getMountainTimeDate();
    return logs
      .filter(l => l.user_id === userId && l.date_logged === today)
      .reduce((sum, l) => sum + l.step_count, 0);
  }

  async getUserLogs(userId: number): Promise<ActivityLog[]> {
    const logs = await this.fetchLogs();
    return logs
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime());
  }

  async updateLog(logId: number, stepCount: number, activityType: string, dateLogged: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_count: stepCount,
          activity_type: activityType,
          date_logged: dateLogged
        })
      });
      if (!res.ok) throw new Error("Failed to update log");
      this.isOnline = true;
      return true;
    } catch (err) {
      console.warn("Backend update failed.", err);
      this.isOnline = false;
      return false;
    }
  }

  async deleteLog(logId: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/logs/${logId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete log");
      this.isOnline = true;
      return true;
    } catch (err) {
      console.warn("Backend delete failed.", err);
      this.isOnline = false;
      return false;
    }
  }

  async getGlobalProgress(): Promise<GlobalProgress> {
    const logs = await this.fetchLogs();

    // Filter logs to only include December 2025 challenge period (Dec 1-31, 2025)
    const CHALLENGE_START = '2025-12-01';
    const CHALLENGE_END = '2025-12-31';
    const decemberLogs = logs.filter(log =>
      log.date_logged >= CHALLENGE_START && log.date_logged <= CHALLENGE_END
    );

    const totalSteps = decemberLogs.reduce((sum, log) => sum + log.step_count, 0);
    const percentage = Math.min(100, Math.round((totalSteps / GLOBAL_GOAL) * 100));
    
    let currentLocation = MILESTONES[0].label;
    for (let i = 0; i < MILESTONES.length; i++) {
      if (totalSteps >= MILESTONES[i].steps) {
        currentLocation = MILESTONES[i].label;
      }
    }

    return {
      totalSteps,
      goal: GLOBAL_GOAL,
      percentage,
      currentLocation
    };
  }

  async getTeamStats(): Promise<TeamStats[]> {
    const teams = await this.fetchTeams();
    const users = await this.fetchUsers();
    const logs = await this.fetchLogs();

    return teams.map(team => {
      const teamMembers = users.filter(u => u.team_id === team.id);
      const memberIds = teamMembers.map(u => u.id);
      const teamLogs = logs.filter(l => memberIds.includes(l.user_id));
      const totalSteps = teamLogs.reduce((sum, log) => sum + log.step_count, 0);
      const memberCount = teamMembers.length;
      const averageSteps = memberCount > 0 ? Math.round(totalSteps / memberCount) : 0;

      return {
        team,
        totalSteps,
        memberCount,
        averageSteps,
        members: teamMembers
      };
    }).sort((a, b) => b.totalSteps - a.totalSteps);
  }

  async getTeamDailyHistory(): Promise<DailyTeamStat[]> {
    const teams = await this.fetchTeams();
    const users = await this.fetchUsers();
    const logs = await this.fetchLogs();

    const history: DailyTeamStat[] = [];
    const today = new Date();
    const challengeStart = new Date('2025-12-01');

    // Calculate days since challenge start (show up to 7 most recent days of the challenge)
    const daysSinceStart = Math.floor((today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysToShow = Math.min(daysSinceStart + 1, 7); // +1 to include today, max 7 days

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      // Skip days before challenge start
      if (d < challengeStart) continue;

      const dateStr = getMountainTimeDate(d);

      const dayStats: DailyTeamStat = {
        date: dateStr.slice(5),
        teams: []
      };

      teams.forEach(team => {
        const teamMembers = users.filter(u => u.team_id === team.id);
        const memberIds = teamMembers.map(u => u.id);

        const teamDayLogs = logs.filter(l => l.date_logged === dateStr && memberIds.includes(l.user_id));
        const totalDaySteps = teamDayLogs.reduce((sum, l) => sum + l.step_count, 0);

        dayStats.teams.push({
          teamId: team.id,
          totalSteps: totalDaySteps
        });
      });

      history.push(dayStats);
    }

    return history;
  }

  // --- Client-side Stats Calculation ---

  private calculateStreak(userLogs: ActivityLog[]): number {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getMountainTimeDate(d);
      
      const daySteps = userLogs
        .filter(l => l.date_logged === dateStr)
        .reduce((sum, l) => sum + l.step_count, 0);
        
      if (daySteps >= DAILY_GOAL) {
        streak++;
      } else if (i === 0 && daySteps < DAILY_GOAL) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  private calculateBadges(userLogs: ActivityLog[], streak: number, dailyWins: number): Badge[] {
    const earnedBadges = JSON.parse(JSON.stringify(BADGES)); // Deep copy
    
    if (streak >= 3) earnedBadges.find((b: Badge) => b.id === 'streak_3')!.earned = true;
    
    if (userLogs.some(l => l.activity_type === 'Bonus: Hydration')) {
      earnedBadges.find((b: Badge) => b.id === 'hydration')!.earned = true;
    }
    
    const stepsByDay: Record<string, number> = {};
    userLogs.forEach(l => {
      stepsByDay[l.date_logged] = (stepsByDay[l.date_logged] || 0) + l.step_count;
    });
    if (Object.values(stepsByDay).some(steps => steps > 15000)) {
      earnedBadges.find((b: Badge) => b.id === 'high_stepper')!.earned = true;
    }

    const weekendLog = userLogs.find(l => {
      const date = new Date(l.date_logged);
      const day = date.getUTCDay();
      return day === 0 || day === 6; 
    });
    if (weekendLog) {
      earnedBadges.find((b: Badge) => b.id === 'weekend')!.earned = true;
    }

    if (dailyWins > 0) {
        const winnerBadge = earnedBadges.find((b: Badge) => b.id === 'daily_winner');
        if (winnerBadge) {
            winnerBadge.earned = true;
            winnerBadge.description = `Top walker for ${dailyWins} day${dailyWins > 1 ? 's' : ''}!`;
        }
    }

    return earnedBadges;
  }

  async getUserStats(): Promise<UserStats[]> {
    const users = await this.fetchUsers();
    const logs = await this.fetchLogs();
    const teams = await this.fetchTeams();

    // Daily Winners Logic
    const dailyTotals: Record<string, Record<number, number>> = {};
    logs.forEach(log => {
        if (!dailyTotals[log.date_logged]) dailyTotals[log.date_logged] = {};
        dailyTotals[log.date_logged][log.user_id] = (dailyTotals[log.date_logged][log.user_id] || 0) + log.step_count;
    });

    const userDailyWins: Record<number, number> = {};
    const todayStr = getMountainTimeDate();

    Object.entries(dailyTotals).forEach(([date, userSteps]) => {
        if (date === todayStr) return;
        let maxSteps = 0;
        let winners: number[] = [];
        Object.entries(userSteps).forEach(([userIdStr, steps]) => {
            const userId = parseInt(userIdStr);
            if (steps > maxSteps) {
                maxSteps = steps;
                winners = [userId];
            } else if (steps === maxSteps) {
                winners.push(userId);
            }
        });
        winners.forEach(uid => {
            userDailyWins[uid] = (userDailyWins[uid] || 0) + 1;
        });
    });

    return users.map(user => {
      const userLogs = logs.filter(l => l.user_id === user.id);
      const totalSteps = userLogs.reduce((sum, log) => sum + log.step_count, 0);
      const team = teams.find(t => t.id === user.team_id);
      const streak = this.calculateStreak(userLogs);
      const dailyWins = userDailyWins[user.id] || 0;
      const badges = this.calculateBadges(userLogs, streak, dailyWins);

      return {
        user,
        teamName: team ? team.name : 'Unknown',
        totalSteps,
        streak,
        badges
      };
    }).sort((a, b) => b.totalSteps - a.totalSteps);
  }
  
  getDaysLeftInMonth(): number {
      // Returns days remaining in the month (including today)
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const diff = endOfMonth.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
  }

  getCurrentDayOfMonth(): number {
      const now = new Date();
      return now.getDate();
  }

  // Fetch official daily win count from server (synced with daily_winners table)
  async getDailyWinCount(userId: number): Promise<number> {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/daily-wins`);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      return data.dailyWins || 0;
    } catch (err) {
      console.warn("Could not fetch daily wins from server, using local calculation");
      // Fallback to local calculation
      const logs = await this.fetchLogs();
      const dailyTotals: Record<string, Record<number, number>> = {};
      logs.forEach(log => {
        if (!dailyTotals[log.date_logged]) dailyTotals[log.date_logged] = {};
        dailyTotals[log.date_logged][log.user_id] = (dailyTotals[log.date_logged][log.user_id] || 0) + log.step_count;
      });

      let wins = 0;
      const todayStr = getMountainTimeDate();
      Object.entries(dailyTotals).forEach(([date, userSteps]) => {
        if (date === todayStr) return;
        const maxSteps = Math.max(...Object.values(userSteps));
        const userStepsToday = userSteps[userId] || 0;
        if (userStepsToday === maxSteps && maxSteps > 0) {
          wins++;
        }
      });
      return wins;
    }
  }
}

export const db = new DataService();