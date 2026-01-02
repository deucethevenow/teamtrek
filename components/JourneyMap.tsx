
import React, { useEffect, useState } from 'react';
import { db } from '../services/dataService';
import { GlobalProgress, TeamStats } from '../types';
import { MapPin, Flag, Flame, Clock, Zap, Trophy } from 'lucide-react';
import { CONVERSION_RATES, getFunInsight, TEAM_AVG_GOAL, GLOBAL_GOAL } from '../constants';

const JourneyMap: React.FC = () => {
  const [progress, setProgress] = useState<GlobalProgress | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);

  const fetchProgress = async () => {
    const data = await db.getGlobalProgress();
    const tStats = await db.getTeamStats();
    setProgress(data);
    setTeamStats(tStats);
  };

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (!progress) return <div className="animate-pulse h-32 bg-gray-200 rounded-xl"></div>;

  const totalCalories = Math.round(progress.totalSteps * CONVERSION_RATES.CALORIES_PER_STEP);
  const totalMinutes = Math.round(progress.totalSteps * CONVERSION_RATES.MINUTES_PER_STEP);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const insight = getFunInsight(progress.totalSteps);

  return (
    <div className="space-y-6">
      {/* SQUAD RACE SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg mr-3">🏆</span>
              The Squad Race
            </h2>
            <span className="text-xs font-bold uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Goal: {((GLOBAL_GOAL / 2) / 1000).toFixed(0)}k Total
            </span>
        </div>

        <div className="space-y-6">
          {teamStats.map((stat) => {
             // Calculate percentage towards the Team Total Goal (half of global goal)
             const teamGoal = GLOBAL_GOAL / 2; // Half of global goal per team
             const actualPercentage = (stat.totalSteps / teamGoal) * 100;
             const displayPercentage = Math.min(100, Math.max(1, actualPercentage)); // Min 1% for visual bar
             const isLead = teamStats.length > 0 && stat.team.id === teamStats[0].team.id;

             return (
               <div key={stat.team.id} className="relative">
                  {/* Team Label */}
                  <div className="flex justify-between text-xs font-bold mb-2 text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>{stat.team.name}</span>
                      <div className="flex -space-x-1 ml-2">
                        {stat.members.map(member => (
                          <div
                            key={member.id}
                            className="w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center text-[10px] relative group cursor-pointer"
                          >
                            {member.avatar_emoji}
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                              {member.username}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={isLead ? 'text-cyan-600 font-extrabold text-sm' : 'text-gray-600 font-bold'}>
                        {actualPercentage.toFixed(1)}%
                      </span>
                      <span className={isLead ? 'text-cyan-600 font-bold' : 'text-gray-500'}>
                        {stat.totalSteps.toLocaleString()}
                      </span>
                      <span className="text-gray-400">of</span>
                      <span className="text-gray-500 font-semibold">
                        {(teamGoal / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>

                  {/* Race Track */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-visible relative flex items-center">
                     {/* Filled Bar */}
                     <div
                        style={{ width: `${displayPercentage}%` }}
                        className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${stat.team.color_hex}`}
                     ></div>

                     {/* Moving Icon */}
                     <div
                        className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-1000 flex flex-col items-center z-10"
                        style={{ left: `${displayPercentage}%`, marginLeft: '-16px' }} // Center icon on end of bar
                     >
                        <div className="text-2xl filter drop-shadow-md transform hover:scale-110 transition-transform cursor-default" title={`${stat.team.name} Average`}>
                          {stat.team.icon}
                        </div>
                     </div>
                  </div>
                  
                  {/* Finish Line */}
                  <div className="absolute right-0 top-4 h-4 w-0.5 bg-gray-300 opacity-50"></div>
                  <div className="absolute right-0 top-9 text-[10px] text-gray-300 font-bold">GOAL</div>
               </div>
             );
          })}
        </div>
      </div>

      {/* GLOBAL JOURNEY SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="bg-cyan-100 text-cyan-600 p-2 rounded-lg mr-3">🌍</span>
          Company Journey
        </h2>
        
        <div className="relative pt-2 pb-6">
          <div className="flex mb-2 items-center justify-between text-xs font-semibold tracking-wide text-gray-600 uppercase">
            <span>Start</span>
            <span className="flex items-center text-cyan-600">
              <Flag size={12} className="mr-1" />
              Global Goal: {(progress.goal / 1000000).toFixed(2)}M
            </span>
          </div>
          
          {/* Progress Track */}
          <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-100 box-shadow-inner relative">
            <div 
              style={{ width: `${progress.percentage}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 ease-out"
            ></div>
          </div>

          {/* Current Location Indicator */}
          <div 
            className="absolute top-8 transform -translate-x-1/2 flex flex-col items-center transition-all duration-1000 z-10"
            style={{ left: `${Math.max(5, Math.min(95, progress.percentage))}%` }}
          >
            <div className="bg-white p-1 rounded-full shadow-lg border border-gray-100">
               <MapPin className="text-pink-500 fill-current" size={24} />
            </div>
            <div className="mt-1 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap shadow-lg font-bold">
              {progress.currentLocation}
            </div>
          </div>
        </div>

        <div className="text-center mt-4 mb-6">
          <div className="inline-flex items-center gap-3 bg-cyan-50 px-4 py-2 rounded-full border border-cyan-100">
            <span className="text-2xl font-extrabold text-cyan-600">{progress.percentage.toFixed(1)}%</span>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-500 uppercase">Progress</p>
              <p className="text-sm text-gray-600">
                <span className="font-bold text-cyan-600">{progress.totalSteps.toLocaleString()}</span> steps
              </p>
            </div>
          </div>
        </div>

        {/* Collective Impact Grid */}
        <div className="border-t border-gray-100 pt-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center">
                <Zap size={12} className="mr-1" /> Collective Impact
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center">
                    <div className="bg-white p-2 rounded-full mr-3 text-orange-500 shadow-sm"><Flame size={16} /></div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 leading-none">{totalCalories.toLocaleString()}</p>
                        <p className="text-[10px] text-orange-700 font-medium uppercase mt-1">Cals Burned</p>
                    </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center">
                    <div className="bg-white p-2 rounded-full mr-3 text-blue-500 shadow-sm"><Clock size={16} /></div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 leading-none">{totalHours}</p>
                        <p className="text-[10px] text-blue-700 font-medium uppercase mt-1">Hours Active</p>
                    </div>
                </div>
            </div>
            <div className="mt-4 bg-gray-900 text-cyan-400 p-3 rounded-xl text-center text-sm font-bold shadow-sm">
                {insight}
            </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyMap;
