import React, { useState, useEffect } from 'react';
import { User, Badge } from '../types';
import { db } from '../services/dataService';
import { getHealthTip } from '../services/geminiService';
import { DAILY_GOAL, BONUS_ACTIVITIES, RAFFLE_THRESHOLD_STEPS, WEEKLY_GOAL, GRAND_PRIZE_THRESHOLD_STEPS, CONVERSION_RATES, calculateMetrics, getFunInsight, getDetailedImpact, getTodaysQuest, getMoodAura } from '../constants';
import { Plus, Flame, Droplets, Moon, Brain, ArrowUp, Ticket, Medal, CalendarClock, CheckCircle2, Crown, Users, Clock, Ruler, Zap, Footprints, Activity, MapPin, Info, Bell, Star, Dumbbell, Smartphone, Snowflake, ThermometerSun, Move, HeartHandshake, Wifi, WifiOff, RefreshCw, Calendar } from 'lucide-react';
import PrizeTracker from './PrizeTracker';
import MilestoneCelebration from './MilestoneCelebration';

interface DashboardProps {
  user: User;
}

// New Logging Types
type LogType = 'quick' | 'workout';

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState(0);
  const [totalMonthSteps, setTotalMonthSteps] = useState(0);
  const [tip, setTip] = useState('Loading good vibes...');
  const [showLogModal, setShowLogModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Logging State
  const [logType, setLogType] = useState<LogType>('quick');
  const [manualSteps, setManualSteps] = useState('');
  const [manualMiles, setManualMiles] = useState('');
  const [manualMins, setManualMins] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [calculatedSteps, setCalculatedSteps] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })); // Default to today in MT
  
  // Gamification State
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [questCompleted, setQuestCompleted] = useState(false);
  
  // Raffle State
  const [hasEnteredWeekly, setHasEnteredWeekly] = useState(false);
  const [hasEnteredGrand, setHasEnteredGrand] = useState(false);
  const [weeklyParticipants, setWeeklyParticipants] = useState<User[]>([]);
  const [grandParticipants, setGrandParticipants] = useState<User[]>([]);
  const [daysLeft, setDaysLeft] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);

  // Milestone Celebration State
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{
    grandPrize: { emoji: string; title: string; description: string } | null;
    totalSteps: number;
    triggeredBy?: { username: string; avatar_emoji: string };
  } | null>(null);

  const todaysQuest = getTodaysQuest();
  const moodAura = getMoodAura(todaySteps);

  const fetchData = async () => {
    const tSteps = await db.getTodaySteps(user.id);
    const wSteps = await db.getWeeklySteps(user.id);
    const mSteps = await db.getTotalMonthSteps(user.id);
    const globalProgress = await db.getGlobalProgress();
    
    setTodaySteps(tSteps);
    setWeeklySteps(wSteps);
    setTotalMonthSteps(mSteps);
    setIsOnline(db.getIsOnline());
    
    // Check Quest Logic (Simplified for demo)
    if (tSteps > (todaysQuest.targetValue || 2000)) {
        setQuestCompleted(true);
    }

    const userStats = await db.getUserStats();
    const myStats = userStats.find(u => u.user.id === user.id);
    
    if (myStats) {
      setStreak(myStats.streak);
      setBadges(myStats.badges);
      setHasEnteredWeekly(myStats.user.raffle_tickets > 0);
      setHasEnteredGrand(myStats.user.grand_prize_entry);
    }
    
    const wParts = await db.getRaffleParticipants();
    const gParts = await db.getGrandPrizeParticipants();
    setWeeklyParticipants(wParts);
    setGrandParticipants(gParts);

    setDaysLeft(db.getDaysLeftInMonth());
    setCurrentDay(db.getCurrentDayOfMonth());

    // Calculate current week (1-4 based on day of month)
    const dayOfMonth = db.getCurrentDayOfMonth();
    const week = Math.ceil(dayOfMonth / 7);
    setCurrentWeek(Math.min(week, 4));

    // Fetch prizes
    try {
      const prizesRes = await fetch('/api/prizes');
      if (prizesRes.ok) {
        const prizesData = await prizesRes.json();
        setPrizes(prizesData);
      }
    } catch (err) {
      console.error('Failed to fetch prizes:', err);
    }

    if (tip === 'Loading good vibes...') {
        const newTip = await getHealthTip(tSteps);
        setTip(newTip);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Check for 50% milestone celebration on mount
  useEffect(() => {
    const checkMilestoneCelebration = async () => {
      try {
        const res = await fetch('/api/milestones/50-percent');
        if (!res.ok) return;

        const data = await res.json();

        if (data.achieved && data.grandPrize) {
          // Check if user has already seen this celebration
          const seenKey = `tt_milestone_50_seen_${user.id}`;
          const hasSeenCelebration = localStorage.getItem(seenKey);

          if (!hasSeenCelebration) {
            setMilestoneData({
              grandPrize: data.grandPrize,
              totalSteps: data.totalStepsAtTrigger,
              triggeredBy: data.triggeredBy
            });
            setShowMilestoneCelebration(true);
          }
        }
      } catch (err) {
        console.error('Failed to check milestone status:', err);
      }
    };

    checkMilestoneCelebration();
  }, [user.id]);

  // Handle milestone celebration close
  const handleMilestoneClose = () => {
    const seenKey = `tt_milestone_50_seen_${user.id}`;
    localStorage.setItem(seenKey, 'true');
    setShowMilestoneCelebration(false);
  };

  // Calculate equivalent steps based on workout inputs
  useEffect(() => {
    if (logType === 'quick') {
        setCalculatedSteps(parseInt(manualSteps) || 0);
    } else {
        // Priority: Distance -> Mins -> Cals
        let s = 0;
        if (manualMiles) {
            s = parseFloat(manualMiles) * CONVERSION_RATES.STEPS_PER_MILE;
        } else if (manualMins) {
            s = parseFloat(manualMins) * CONVERSION_RATES.STEPS_PER_MINUTE;
        } else if (manualCals) {
            s = parseFloat(manualCals) * CONVERSION_RATES.STEPS_PER_CALORIE;
        }
        setCalculatedSteps(Math.round(s));
    }
  }, [logType, manualSteps, manualMiles, manualMins, manualCals]);

  const handleLogSubmit = async () => {
    if (isSubmitting || calculatedSteps === 0) return;
    setIsSubmitting(true);
    
    try {
        let description = 'Walking';
        
        if (logType === 'workout') {
            const parts = [];
            if (manualMiles) parts.push(`${manualMiles} mi`);
            if (manualMins) parts.push(`${manualMins} min`);
            if (manualCals) parts.push(`${manualCals} cal`);
            
            if (parts.length > 0) {
                description = `Workout (${parts.join(', ')})`;
            }
        }

        await db.logActivity(user.id, calculatedSteps, description, selectedDate);

        // Reset Form
        setManualSteps('');
        setManualMiles('');
        setManualMins('');
        setManualCals('');
        setLogType('quick');
        setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })); // Reset to today

        setShowLogModal(false);
        await fetchData(); 
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleBonusLog = async (steps: number, type: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
        await db.logActivity(user.id, steps, type, selectedDate);
        setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })); // Reset to today
        setShowLogModal(false);
        await fetchData();
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleEnterWeeklyRaffle = async () => {
    if (weeklySteps < RAFFLE_THRESHOLD_STEPS) return;
    const success = await db.enterWeeklyRaffle(user.id);
    if (success) {
      alert("🎟️ You're in! Good luck in this week's draw!");
      fetchData();
    }
  };

  const handleEnterGrandPrize = async () => {
    if (totalMonthSteps < GRAND_PRIZE_THRESHOLD_STEPS) return;
    const success = await db.enterGrandPrize(user.id);
    if (success) {
      alert("👑 You're in the Grand Prize Draw! Outstanding work!");
      fetchData();
    }
  };
  
  const getBonusIcon = (iconName: string) => {
      switch(iconName) {
          case 'Dumbbell': return <Dumbbell size={18} />;
          case 'SmartphoneOff': return <Smartphone size={18} />;
          case 'Snowflake': return <Snowflake size={18} />;
          case 'ThermometerSun': return <ThermometerSun size={18} />;
          case 'Move': return <Move size={18} />;
          case 'HeartHandshake': return <HeartHandshake size={18} />;
          case 'Moon': return <Moon size={18} />;
          case 'Droplets': return <Droplets size={18} />;
          default: return <Flame size={18} />;
      }
  };

  const progressPercentage = Math.min(100, (todaySteps / DAILY_GOAL) * 100);
  const weeklyPercentage = Math.min(100, (weeklySteps / RAFFLE_THRESHOLD_STEPS) * 100);
  const grandPercentage = Math.min(100, (totalMonthSteps / GRAND_PRIZE_THRESHOLD_STEPS) * 100);

  // Calculate company global progress percentage
  const [companyProgress, setCompanyProgress] = useState(0);

  useEffect(() => {
    const fetchGlobalProgress = async () => {
      const progress = await db.getGlobalProgress();
      setCompanyProgress(progress.percentage);
    };
    fetchGlobalProgress();
  }, [totalMonthSteps]);

  const showGrandPrize = companyProgress >= 50;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Stats Calc using central helper
  const todayMetrics = calculateMetrics(todaySteps);
  const monthMetrics = calculateMetrics(totalMonthSteps);
  const insight = getFunInsight(totalMonthSteps);
  const todayImpactDetails = getDetailedImpact(todaySteps);
  const monthImpactDetails = getDetailedImpact(totalMonthSteps);

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
           {/* MOOD AURA AVATAR */}
           <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white text-xl mr-3 border-4 relative shadow-lg ${moodAura.glow}`} >
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${moodAura.color} opacity-20`}></div>
              <div className={`absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-br ${moodAura.color} [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]`}></div>
              <span className="relative z-10">{user.avatar_emoji}</span>
              <div className={`absolute -bottom-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white bg-gradient-to-r ${moodAura.color} shadow-sm uppercase tracking-wider`}>
                {moodAura.label}
              </div>
           </div>
           
           <div>
             <h1 className="text-2xl font-bold text-gray-900">Hi, {user.username}</h1>
             <p className="text-gray-500 text-sm">Dec Challenge: <span className="font-bold text-cyan-600">Day {currentDay}</span></p>
           </div>
        </div>
        <div className="flex flex-col items-end">
            {streak > 0 ? (
                <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1 flex items-center animate-pulse border border-orange-100">
                    <Flame size={12} className="mr-1 fill-current" />
                    {streak} Day Streak
                </div>
            ) : (
                <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1 flex items-center">
                    <CalendarClock size={12} className="mr-1" />
                    {daysLeft} Days Left
                </div>
            )}
        </div>
      </div>

      {/* NEW: Daily Quest Card */}
      <div className="bg-gray-900 rounded-2xl p-4 shadow-lg flex items-center justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-cyan-500/20 to-transparent"></div>
        <div className="flex items-center relative z-10">
            <div className="bg-gray-800 p-3 rounded-xl mr-4 text-2xl border border-gray-700">
                {todaysQuest.icon}
            </div>
            <div>
                <div className="flex items-center text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Bell size={12} className="mr-1" /> Recess Bell
                </div>
                <h3 className="text-white font-bold text-sm">{todaysQuest.label}</h3>
                <p className="text-gray-400 text-xs">{todaysQuest.description}</p>
            </div>
        </div>
        <div className="relative z-10">
            {questCompleted ? (
                <div className="bg-yellow-500 text-gray-900 p-2 rounded-full shadow-lg shadow-yellow-500/20 animate-bounce">
                    <Star size={20} className="fill-current" />
                </div>
            ) : (
                <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-dashed"></div>
            )}
        </div>
      </div>

      {/* Main Activity Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Circular Progress */}
            <div className="relative w-48 h-48 mb-6 md:mb-0 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100"/>
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-cyan-500 transition-all duration-1000 ease-out" strokeLinecap="round"/>
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-gray-900">{todaySteps.toLocaleString()}</span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-1">/ {DAILY_GOAL.toLocaleString()} steps</span>
              </div>
            </div>
            
            {/* Today's Stats Grid */}
            <div className="flex-1 w-full md:ml-8">
                <div className="mb-3 px-1">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Activity</h4>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-xl border border-orange-200">
                        <div className="flex items-center text-orange-600 text-xs font-bold uppercase mb-1">
                            <Flame size={12} className="mr-1" /> Calories
                        </div>
                        <div className="text-lg font-bold text-gray-900">{todayMetrics.calories.toLocaleString()} <span className="text-xs font-normal text-gray-600">kcal</span></div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200">
                        <div className="flex items-center text-blue-600 text-xs font-bold uppercase mb-1">
                            <Clock size={12} className="mr-1" /> Time
                        </div>
                        <div className="text-lg font-bold text-gray-900">{todayMetrics.minutes.toLocaleString()} <span className="text-xs font-normal text-gray-600">mins</span></div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-3 rounded-xl border border-cyan-200">
                        <div className="flex items-center text-cyan-600 text-xs font-bold uppercase mb-1">
                            <Ruler size={12} className="mr-1" /> Distance
                        </div>
                        <div className="text-lg font-bold text-gray-900">{todayMetrics.miles} <span className="text-xs font-normal text-gray-600">mi</span></div>
                    </div>
                </div>

                <div className="mb-2 px-1">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Month</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center text-gray-500 text-xs font-bold uppercase mb-1">
                            <Flame size={12} className="mr-1" />
                        </div>
                        <div className="text-sm font-bold text-gray-700">{monthMetrics.calories.toLocaleString()} <span className="text-xs font-normal text-gray-500">kcal</span></div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center text-gray-500 text-xs font-bold uppercase mb-1">
                            <Clock size={12} className="mr-1" />
                        </div>
                        <div className="text-sm font-bold text-gray-700">{monthMetrics.minutes.toLocaleString()} <span className="text-xs font-normal text-gray-500">mins</span></div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center text-gray-500 text-xs font-bold uppercase mb-1">
                            <Ruler size={12} className="mr-1" />
                        </div>
                        <div className="text-sm font-bold text-gray-700">{monthMetrics.miles} <span className="text-xs font-normal text-gray-500">mi</span></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Quick Log Button */}
        <button
          onClick={() => setShowLogModal(true)}
          className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-gray-300 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center"
        >
          <Plus className="mr-2" /> Log Activity
        </button>
      </div>

      {/* Detailed Impact / Fun Facts Section */}
      <div>
          <div className="flex items-center mb-3 px-2">
              <Info className="w-4 h-4 text-cyan-500 mr-2" />
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Your Impact</h3>
          </div>

          {/* Today's Impact */}
          <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Today</h4>
              <div className="grid grid-cols-3 gap-3">
                {todayImpactDetails.map((stat, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-xl border border-orange-200 text-center">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-lg font-bold text-gray-900 leading-none">{stat.value}</div>
                        <div className="text-[10px] font-bold uppercase text-orange-600 mt-1">{stat.label}</div>
                    </div>
                ))}
              </div>
          </div>

          {/* This Month Impact */}
          <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">This Month</h4>
              <div className="grid grid-cols-3 gap-3">
                {monthImpactDetails.map((stat, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-lg font-bold text-gray-900 leading-none">{stat.value}</div>
                        <div className="text-[10px] font-bold uppercase text-gray-500 mt-1">{stat.label}</div>
                        <div className="text-[9px] text-cyan-600 font-medium bg-cyan-50 px-2 py-0.5 rounded-full mt-1.5">
                            {stat.detail}
                        </div>
                    </div>
                ))}
              </div>
          </div>
      </div>

      {/* Health Tip (AI) */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start">
          <div className="bg-white/20 p-2 rounded-lg mr-3">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase opacity-75 tracking-wider mb-1">Daily Vibe Check</h3>
            <p className="font-medium leading-relaxed text-sm">{tip}</p>
          </div>
        </div>
      </div>
      
      {/* Rewards Layout */}
      <div className="grid grid-cols-1 gap-6">
          
          {/* WEEKLY RAFFLE CARD */}
          <div className="bg-gradient-to-br from-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                     <h3 className="text-lg font-bold flex items-center text-white mb-1"><Ticket className="mr-2 text-emerald-400" /> Week {currentWeek} Prize</h3>
                     {prizes.find(p => p.week_number === currentWeek) && (
                       <div className="mt-2 bg-emerald-700/50 rounded-lg p-2 border border-emerald-500/30">
                         <div className="flex items-center gap-2">
                           <span className="text-2xl">{prizes.find(p => p.week_number === currentWeek)?.emoji}</span>
                           <div>
                             <p className="text-sm font-bold text-white">{prizes.find(p => p.week_number === currentWeek)?.title}</p>
                             <p className="text-xs text-emerald-200">{prizes.find(p => p.week_number === currentWeek)?.description}</p>
                           </div>
                         </div>
                       </div>
                     )}
                     <p className="text-emerald-200 text-xs mt-2">Hit 60% of weekly goal ({RAFFLE_THRESHOLD_STEPS.toLocaleString()})</p>
                 </div>
             </div>
             
             {/* Progress Bar */}
             <div className="mb-4 relative z-10">
                 <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wider">
                     <span className="text-emerald-200">Your Progress</span>
                     <span className={weeklySteps >= RAFFLE_THRESHOLD_STEPS ? "text-white" : "text-emerald-300"}>
                        {Math.round(weeklyPercentage)}%
                     </span>
                 </div>
                 <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                     <div 
                        style={{ width: `${weeklyPercentage}%` }}
                        className="h-full rounded-full transition-all duration-1000 bg-emerald-400"
                     ></div>
                 </div>
                 <p className="text-right text-[10px] mt-1 text-emerald-300">{weeklySteps.toLocaleString()} / {RAFFLE_THRESHOLD_STEPS.toLocaleString()} steps</p>
             </div>
             
             {/* Participants List */}
             <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider flex items-center">
                        <Users size={12} className="mr-1"/> Qualifiers ({weeklyParticipants.length})
                    </p>
                    
                    {hasEnteredWeekly ? (
                        <span className="flex items-center text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-md font-bold shadow-sm">
                            <CheckCircle2 size={10} className="mr-1" /> Entered
                        </span>
                    ) : (
                        weeklySteps >= RAFFLE_THRESHOLD_STEPS && (
                            <button 
                                onClick={handleEnterWeeklyRaffle}
                                className="text-[10px] bg-white text-teal-900 px-3 py-1 rounded-md font-bold hover:bg-teal-50 shadow-sm"
                            >
                                Enter Now
                            </button>
                        )
                    )}
                </div>
                
                {weeklyParticipants.length === 0 ? (
                    <p className="text-xs text-emerald-300/60 italic text-center py-2">Be the first to qualify!</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {weeklyParticipants.map(p => (
                            <div key={p.id} className={`flex items-center p-2 rounded-lg transition-colors ${p.id === user.id ? 'bg-emerald-500/40 border border-emerald-400/50' : 'bg-black/20'}`}>
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100/10 text-sm mr-2">
                                    {p.avatar_emoji}
                                </div>
                                <span className={`text-xs font-medium truncate ${p.id === user.id ? 'text-white' : 'text-emerald-100'}`}>
                                    {p.username}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* GRAND PRIZE CARD - Only shows when company hits 50% */}
          {showGrandPrize ? (
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border-t-4 border-yellow-400">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-yellow-400 opacity-10 rounded-full blur-3xl"></div>

             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="w-full">
                     <h3 className="text-lg font-bold flex items-center text-white mb-1"><Crown className="mr-2 text-yellow-400" /> Grand Prize Unlocked!</h3>
                     {prizes.find(p => p.prize_type === 'grand') && (
                       <div className="mt-2 bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/40">
                         <div className="flex items-center gap-3">
                           <span className="text-4xl">{prizes.find(p => p.prize_type === 'grand')?.emoji}</span>
                           <div>
                             <p className="text-base font-bold text-yellow-100">{prizes.find(p => p.prize_type === 'grand')?.title}</p>
                             <p className="text-sm text-indigo-200">{prizes.find(p => p.prize_type === 'grand')?.description}</p>
                           </div>
                         </div>
                       </div>
                     )}
                     <p className="text-indigo-200 text-xs mt-2">Hit 70% of Dec goal ({GRAND_PRIZE_THRESHOLD_STEPS.toLocaleString()})</p>
                 </div>
             </div>
             
             {/* Progress Bar */}
             <div className="mb-4 relative z-10">
                 <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wider">
                     <span className="text-indigo-200">Month Progress</span>
                     <span className={totalMonthSteps >= GRAND_PRIZE_THRESHOLD_STEPS ? "text-yellow-400" : "text-indigo-300"}>
                        {Math.round(grandPercentage)}%
                     </span>
                 </div>
                 <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                     <div 
                        style={{ width: `${grandPercentage}%` }}
                        className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-yellow-400 to-orange-500"
                     ></div>
                 </div>
                 <p className="text-right text-[10px] mt-1 text-indigo-300">{totalMonthSteps.toLocaleString()} / {GRAND_PRIZE_THRESHOLD_STEPS.toLocaleString()} steps</p>
             </div>
             
             {/* Participants List */}
             <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider flex items-center">
                        <Users size={12} className="mr-1"/> Legends ({grandParticipants.length})
                    </p>
                    
                    {hasEnteredGrand ? (
                        <span className="flex items-center text-[10px] bg-yellow-500 text-indigo-900 px-2 py-1 rounded-md font-bold shadow-sm">
                            <CheckCircle2 size={10} className="mr-1" /> Locked In
                        </span>
                    ) : (
                         totalMonthSteps >= GRAND_PRIZE_THRESHOLD_STEPS && (
                            <button 
                                onClick={handleEnterGrandPrize}
                                className="text-[10px] bg-yellow-400 text-indigo-900 px-3 py-1 rounded-md font-bold hover:bg-yellow-300 shadow-sm"
                            >
                                Unlock
                            </button>
                        )
                    )}
                </div>
                
                {grandParticipants.length === 0 ? (
                    <p className="text-xs text-indigo-300/60 italic text-center py-2">The podium is waiting...</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {grandParticipants.map(p => (
                            <div key={p.id} className={`flex items-center p-2 rounded-lg transition-colors ${p.id === user.id ? 'bg-yellow-500/20 border border-yellow-400/50' : 'bg-black/20'}`}>
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100/10 text-sm mr-2">
                                    {p.avatar_emoji}
                                </div>
                                <span className={`text-xs font-medium truncate ${p.id === user.id ? 'text-yellow-100' : 'text-indigo-100'}`}>
                                    {p.username}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border-2 border-dashed border-gray-600">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Grand Prize Locked</h3>
                <p className="text-gray-400 text-sm">
                  Team must reach 50% of company goal to unlock!
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Current progress: {companyProgress.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

      </div>

      {/* Prize Tracker */}
      <PrizeTracker />

      {/* Badges Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Medal className="mr-2 text-yellow-500" /> Badges
        </h3>
        <div className="grid grid-cols-2 gap-3">
            {badges.map(badge => (
                <div key={badge.id} className={`p-3 rounded-xl border flex items-center ${badge.earned ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                    <div className="text-2xl mr-3">{badge.earned ? badge.icon : '🔒'}</div>
                    <div>
                        <p className={`text-sm font-bold ${badge.earned ? 'text-gray-900' : 'text-gray-500'}`}>{badge.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{badge.description}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      {/* Connection Status Footer for Dashboard */}
      {!isOnline && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 text-red-700 border border-red-200 shadow-lg rounded-full px-4 py-2 flex items-center text-xs font-bold animate-bounce">
            <WifiOff size={14} className="mr-2" /> 
            Offline Mode
            <button onClick={() => fetchData()} className="ml-3 bg-white border border-red-200 rounded-full p-1 hover:bg-red-50">
                <RefreshCw size={12} />
            </button>
        </div>
      )}

      {/* LOG ACTIVITY MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Log Activity</h2>
              <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            {/* Date Picker */}
            <div className="mb-6 bg-cyan-50 p-4 rounded-xl border border-cyan-100">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center">
                <Calendar size={14} className="mr-1.5 text-cyan-600" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })}
                className="w-full border border-cyan-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
              />
              <p className="text-xs text-gray-500 mt-2">
                {selectedDate === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })
                  ? '📍 Logging for today'
                  : '⏪ Logging for a past date'}
              </p>
            </div>

            {/* Main Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                <button 
                    onClick={() => setLogType('quick')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${logType === 'quick' ? 'bg-white shadow-sm text-cyan-600' : 'text-gray-500'}`}
                >
                    <Footprints size={18} className="mr-2" /> Steps
                </button>
                <button 
                    onClick={() => setLogType('workout')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${logType === 'workout' ? 'bg-white shadow-sm text-cyan-600' : 'text-gray-500'}`}
                >
                    <MapPin size={18} className="mr-2" /> Log Walk
                </button>
            </div>

            {/* Step 1: Quick Log */}
            {logType === 'quick' && (
                 <div className="space-y-4">
                     <label className="block text-sm font-medium text-gray-500 uppercase tracking-wider">Enter Total Steps</label>
                     <input
                        type="number"
                        placeholder="0"
                        value={manualSteps}
                        onChange={(e) => setManualSteps(e.target.value)}
                        className="w-full border border-gray-200 rounded-2xl px-6 py-4 text-3xl font-bold text-center text-gray-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                      <div className="bg-gray-50 text-center text-xs text-gray-500 py-2 rounded-lg">
                          Looking to log a hike or run? Switch to "Log Walk" above.
                      </div>
                 </div>
            )}

            {/* Step 2: Workout Log */}
            {logType === 'workout' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center"><Ruler size={14} className="mr-1"/> DISTANCE (Miles)</label>
                            <input type="number" value={manualMiles} onChange={(e)=>setManualMiles(e.target.value)} placeholder="0.0" className="w-full border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center"><Clock size={14} className="mr-1"/> TIME (Mins)</label>
                            <input type="number" value={manualMins} onChange={(e)=>setManualMins(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:border-cyan-500" />
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center"><Flame size={14} className="mr-1"/> CALORIES (Optional)</label>
                         <input type="number" value={manualCals} onChange={(e)=>setManualCals(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:border-cyan-500" />
                    </div>
                    
                    {/* Realtime Calc Preview */}
                    <div className="mt-4 bg-cyan-50 border border-cyan-100 rounded-xl p-3 text-center">
                        <p className="text-cyan-600 text-xs font-bold uppercase mb-1">Calculated Impact</p>
                        <p className="text-2xl font-bold text-cyan-900">{calculatedSteps.toLocaleString()} <span className="text-sm font-normal">steps</span></p>
                    </div>
                </div>
            )}

            {/* Submit Action */}
            <button
                disabled={isSubmitting || calculatedSteps === 0}
                onClick={handleLogSubmit}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg mt-6 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center"
            >
                {isSubmitting ? 'Saving...' : `Log ${calculatedSteps.toLocaleString()} Steps`}
            </button>

            {/* Quick Bonus Divider */}
            <div className="relative flex py-6 items-center">
               <div className="flex-grow border-t border-gray-200"></div>
               <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">Quick Wellness Bonuses</span>
               <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
               {BONUS_ACTIVITIES.map((activity) => (
                  <button
                    key={activity.type}
                    disabled={isSubmitting}
                    onClick={() => handleBonusLog(activity.steps, activity.type)}
                    className="flex items-center w-full p-3 rounded-xl border border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-cyan-600 mr-3 group-hover:bg-white group-hover:text-cyan-500 transition-colors">
                      {getBonusIcon(activity.icon || 'Flame')}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900 text-sm">{activity.label}</span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+{activity.steps}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 pr-2">{activity.description}</p>
                    </div>
                  </button>
               ))}
            </div>

          </div>
        </div>
      )}

      {/* Milestone Celebration Modal */}
      {showMilestoneCelebration && milestoneData && milestoneData.grandPrize && (
        <MilestoneCelebration
          grandPrize={milestoneData.grandPrize}
          totalSteps={milestoneData.totalSteps}
          triggeredBy={milestoneData.triggeredBy}
          onClose={handleMilestoneClose}
        />
      )}
    </div>
  );
};

export default Dashboard;