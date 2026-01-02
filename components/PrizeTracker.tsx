import React, { useEffect, useState } from 'react';
import { Trophy, Users, CheckCircle2, XCircle, Award, Calendar, Sparkles, TrendingUp } from 'lucide-react';

interface Prize {
  id: number;
  week_number: number | null;
  prize_type: string;
  title: string;
  description: string;
  emoji: string;
  winner_user_id: number | null;
  winner_name: string | null;
  winner_emoji: string | null;
  drawn_at: string | null;
}

interface PrizeEntry {
  user_id: number;
  username: string;
  avatar_emoji: string;
  opted_in: boolean;
  qualified: boolean;
  team_id: number;
}

const PrizeTracker: React.FC = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [entries, setEntries] = useState<PrizeEntry[]>([]);
  const [globalProgress, setGlobalProgress] = useState(0);

  useEffect(() => {
    loadPrizes();
    loadGlobalProgress();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      loadEntries(selectedWeek);
    }
  }, [selectedWeek]);

  const loadPrizes = async () => {
    try {
      const res = await fetch('/api/prizes');
      const data = await res.json();
      setPrizes(data);
    } catch (err) {
      console.error("Error loading prizes:", err);
    }
  };

  const loadGlobalProgress = async () => {
    try {
      const res = await fetch('/api/logs');
      const logs = await res.json();

      // Filter logs to only include December 2025 challenge period (Dec 1-31, 2025)
      const CHALLENGE_START = '2025-12-01';
      const CHALLENGE_END = '2025-12-31';
      const decemberLogs = logs.filter((log: any) =>
        log.date_logged >= CHALLENGE_START && log.date_logged <= CHALLENGE_END
      );

      const totalSteps = decemberLogs.reduce((sum: number, log: any) => sum + log.step_count, 0);
      const GLOBAL_GOAL = 2170000; // 10 users * 7000 steps * 31 days
      const percentage = Math.min(100, (totalSteps / GLOBAL_GOAL) * 100);
      setGlobalProgress(percentage);
    } catch (err) {
      console.error("Error loading global progress:", err);
    }
  };

  const loadEntries = async (week: number) => {
    try {
      const res = await fetch(`/api/prizes/${week}/entries`);
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error("Error loading entries:", err);
      setEntries([]);
    }
  };

  // Calculate current week (December 1-31, 2025 challenge)
  const getCurrentWeek = () => {
    const startDate = new Date('2025-12-01'); // December challenge start date
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(Math.ceil(diffDays / 7), 4);
  };

  const currentWeek = getCurrentWeek();
  const weeklyPrizes = prizes.filter(p => p.prize_type === 'weekly');
  const grandPrize = prizes.find(p => p.prize_type === 'grand');
  const selectedPrize = prizes.find(p => p.week_number === selectedWeek);

  const optedInCount = entries.filter(e => e.opted_in).length;
  const optedOutCount = entries.filter(e => !e.opted_in).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Trophy className="text-purple-500 mr-2" size={20} />
          Prize Tracker
        </h2>
        <p className="text-xs text-gray-500 mt-1">View weekly prizes, winners, and participation</p>
      </div>

      {/* Week Selector */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-4 gap-2">
          {weeklyPrizes.map((prize) => {
            const isCurrentWeek = prize.week_number === currentWeek;
            const isPastWeek = prize.week_number! < currentWeek;
            const isSelected = prize.week_number === selectedWeek;
            const hasWinner = !!prize.winner_user_id;

            return (
              <button
                key={prize.id}
                onClick={() => setSelectedWeek(prize.week_number!)}
                className={`relative py-3 px-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : hasWinner
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : isCurrentWeek
                    ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="text-lg mb-1">{prize.emoji}</div>
                Week {prize.week_number}
                {hasWinner && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <CheckCircle2 size={12} />
                  </div>
                )}
                {isCurrentWeek && !hasWinner && (
                  <div className="absolute -top-1 -right-1 bg-cyan-500 text-white rounded-full px-2 py-0.5 text-[9px] font-bold">
                    NOW
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Winners Hall of Fame - Shows all weeks' winners at a glance */}
      {weeklyPrizes.some(p => p.winner_user_id) && (
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100">
          <div className="flex items-center gap-2 mb-3">
            <Award className="text-yellow-600" size={18} />
            <h3 className="text-sm font-bold text-gray-800">Winners Hall of Fame</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {weeklyPrizes.map((prize) => (
              <div
                key={prize.id}
                className={`rounded-lg p-3 text-center transition-all ${
                  prize.winner_user_id
                    ? 'bg-white border-2 border-yellow-300 shadow-sm'
                    : 'bg-gray-100 border border-gray-200 opacity-50'
                }`}
              >
                <div className="text-xs font-bold text-gray-500 mb-1">Week {prize.week_number}</div>
                {prize.winner_user_id ? (
                  <>
                    <div className="text-2xl mb-1">{prize.winner_emoji}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{prize.winner_name}</div>
                    <div className="text-xs text-yellow-600 mt-1">{prize.emoji} {prize.title.split(' ').slice(0, 2).join(' ')}</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-1 opacity-30">❓</div>
                    <div className="text-xs text-gray-400">TBD</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prize Details */}
      {selectedPrize && (
        <div className="p-6">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 mb-4 border border-purple-100">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{selectedPrize.emoji}</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedPrize.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedPrize.description}</p>
              </div>
            </div>

            {/* Winner Display */}
            {selectedPrize.winner_user_id && (
              <div className="mt-4 bg-white rounded-lg p-4 border-2 border-yellow-400">
                <div className="flex items-center gap-3">
                  <Award className="text-yellow-500" size={24} />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Winner</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">{selectedPrize.winner_emoji}</span>
                      <span className="text-lg font-bold text-gray-900">{selectedPrize.winner_name}</span>
                    </div>
                  </div>
                  {selectedPrize.drawn_at && (
                    <div className="ml-auto text-right">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(selectedPrize.drawn_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Participation Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="text-green-600" size={16} />
                <p className="text-xs font-bold text-gray-600 uppercase">Opted In</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{optedInCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="text-gray-400" size={16} />
                <p className="text-xs font-bold text-gray-600 uppercase">Opted Out</p>
              </div>
              <p className="text-3xl font-bold text-gray-600">{optedOutCount}</p>
            </div>
          </div>

          {/* Participants List */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-700">Participants</h4>
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No entries yet for this week</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {entries
                  .sort((a, b) => {
                    // Opted in first, then alphabetical
                    if (a.opted_in !== b.opted_in) return a.opted_in ? -1 : 1;
                    return a.username.localeCompare(b.username);
                  })
                  .map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        entry.opted_in
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl border-2 border-gray-200">
                          {entry.avatar_emoji}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{entry.username}</p>
                          <p className="text-xs text-gray-500">
                            {entry.team_id === 1 ? 'Cloud Walkers' : 'Mood Lifters'}
                          </p>
                        </div>
                      </div>
                      <div>
                        {entry.opted_in ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                            <CheckCircle2 size={14} />
                            Opted In
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                            <XCircle size={14} />
                            Opted Out
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grand Prize Section - Gated at 50% */}
      {grandPrize && (
        globalProgress >= 50 ? (
          <div className="p-6 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-t-4 border-yellow-400 relative overflow-hidden">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 via-transparent to-yellow-200/20 animate-pulse" />

            {/* Header with NEW badge and animated trophy */}
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="relative">
                <Trophy className="text-yellow-600" size={28} />
                {/* Pulsing indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Grand Prize Unlocked!</h3>
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm">
                New!
              </span>
            </div>

            {/* Prize Card */}
            <div className="bg-white rounded-xl p-5 border-2 border-yellow-300 shadow-lg relative z-10">
              {/* Sparkle decorations */}
              <div className="absolute top-3 right-3 text-yellow-400 animate-pulse">
                <Sparkles size={16} />
              </div>

              <div className="flex items-start gap-4">
                <div className="text-5xl drop-shadow-sm">{grandPrize.emoji}</div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{grandPrize.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{grandPrize.description}</p>
                </div>
              </div>

              {/* Qualification reminder */}
              {!grandPrize.winner_user_id && (
                <div className="mt-4 pt-3 border-t border-yellow-200">
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <TrendingUp size={16} />
                    <span>Hit <strong>70%</strong> of your personal goal to enter the drawing!</span>
                  </div>
                </div>
              )}

              {grandPrize.winner_user_id && (
                <div className="mt-4 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 border-2 border-yellow-400">
                  <div className="flex items-center gap-3">
                    <Award className="text-yellow-600" size={24} />
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">Grand Prize Winner</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl">{grandPrize.winner_emoji}</span>
                        <span className="text-lg font-bold text-gray-900">{grandPrize.winner_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 border-t-4 border-gray-400">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="text-gray-500" size={24} />
              <h3 className="text-lg font-bold text-gray-600">Grand Prize</h3>
            </div>
            <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-300 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h4 className="text-xl font-bold text-gray-700 mb-2">Grand Prize Locked</h4>
              <p className="text-sm text-gray-600 mb-3">
                Team must reach 50% of company goal to unlock the grand prize!
              </p>
              <div className="bg-gray-100 rounded-lg p-3 inline-block">
                <p className="text-xs text-gray-500 mb-1">Current Progress</p>
                <p className="text-2xl font-bold text-gray-700">{globalProgress.toFixed(1)}%</p>
                <div className="w-48 bg-gray-300 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    style={{ width: `${globalProgress}%` }}
                    className="h-full bg-gray-500 rounded-full transition-all"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default PrizeTracker;
