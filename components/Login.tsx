import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { Team, User } from '../types';
import { APP_NAME } from '../constants';
import { ArrowRight, Loader2, Wifi, WifiOff } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingInId, setLoggingInId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [teamsData, usersData] = await Promise.all([
          db.getAllTeams(),
          db.getAllUsers()
        ]);
        setTeams(teamsData);
        setUsers(usersData);
        setIsOnline(db.getIsOnline());
      } catch (err) {
        console.error("Failed to load login data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUserSelect = async (userId: number) => {
    setLoggingInId(userId);
    try {
      const user = await db.loginById(userId);
      onLogin(user);
    } catch (error) {
      console.error(error);
      alert("Could not log in. Please try again.");
    } finally {
      setLoggingInId(null);
    }
  };

  const getTeamMembers = (teamId: number) => {
    return users.filter(u => u.team_id === teamId);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4 md:p-8">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 relative">
        
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 p-10 text-center relative overflow-hidden">
           {/* Abstract decoration */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-900 opacity-10 rounded-full blur-2xl -ml-10 -mb-10"></div>
           
           <div className="relative z-10">
            <h1 className="text-5xl font-bold text-white tracking-tight lowercase mb-2">{APP_NAME}</h1>
            <p className="text-cyan-50 text-lg font-medium opacity-90">Who is walking today?</p>
           </div>
        </div>

        <div className="p-8 md:p-12 bg-gray-50/50 pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Loading roster...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {teams.map((team) => (
                <div key={team.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                  {/* Team Header */}
                  <div className={`flex items-center mb-6 pb-4 border-b ${team.id === 1 ? 'border-cyan-100' : 'border-orange-100'}`}>
                    <span className="text-3xl mr-3">{team.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Team {team.id}</p>
                    </div>
                  </div>

                  {/* Members Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {getTeamMembers(team.id).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user.id)}
                        disabled={loggingInId !== null}
                        className={`group relative flex items-center p-3 rounded-xl border transition-all duration-200 text-left
                          ${loggingInId === user.id ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-100 hover:border-cyan-300 hover:shadow-md hover:-translate-y-0.5'}
                        `}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl mr-3 border border-gray-100 group-hover:scale-110 transition-transform">
                          {user.avatar_emoji}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors block">
                            {user.username}
                          </span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500">
                           {loggingInId === user.id ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-8 text-xs text-gray-400 max-w-md mx-auto">
            <p>Select your profile to continue. Your progress is automatically synced across all your devices.</p>
          </div>
        </div>

        {/* Connection Status Footer */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center text-xs font-medium border-t transition-colors ${isOnline ? 'bg-white text-green-600 border-gray-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {isOnline ? (
                <span className="flex items-center"><Wifi size={14} className="mr-2" /> Connected to HQ</span>
            ) : (
                <span className="flex items-center"><WifiOff size={14} className="mr-2" /> Offline Mode (Data saving locally)</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;