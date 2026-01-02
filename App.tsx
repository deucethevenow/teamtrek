
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import JourneyMap from './components/JourneyMap';
import MyEntries from './components/MyEntries';
import { User } from './types';
import { LayoutDashboard, Map, ClipboardList } from 'lucide-react';
import { APP_NAME } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'journey' | 'entries'>('dashboard');

  // Simple persistence for logged-in state within session
  useEffect(() => {
    const storedUser = localStorage.getItem('tt_current_session_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('tt_current_session_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tt_current_session_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-0 md:flex">
      
      {/* Desktop Sidebar (Hidden on mobile) */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-cyan-500 tracking-tight flex items-center lowercase">
            {APP_NAME}
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setCurrentView('dashboard')} 
            className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'dashboard' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="mr-3" size={20} /> Dashboard
          </button>
          <button
            onClick={() => setCurrentView('journey')}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'journey' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Map className="mr-3" size={20} /> Journey
          </button>
          <button
            onClick={() => setCurrentView('entries')}
            className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'entries' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ClipboardList className="mr-3" size={20} /> My Entries
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center mb-4">
             <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-lg mr-3">
               {user.avatar_emoji}
             </div>
             <div>
               <p className="text-sm font-bold text-gray-900">{user.username}</p>
               <p className="text-xs text-gray-500">Recess Walker</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full text-sm text-gray-400 hover:text-red-500 text-left px-2">Sign Out</button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl mx-auto md:px-8 md:py-8 p-4">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <div className="text-2xl font-bold text-cyan-500 lowercase">
             {APP_NAME}
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-400">Log Out</button>
        </div>

        {currentView === 'dashboard' && <Dashboard user={user} />}

        {currentView === 'journey' && (
          <div className="space-y-6">
            <JourneyMap />
            <Leaderboard />
          </div>
        )}

        {currentView === 'entries' && <MyEntries user={user} />}
      </main>

      {/* Mobile Bottom Nav (Sticky) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-50 pb-safe">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg ${currentView === 'dashboard' ? 'text-cyan-600' : 'text-gray-400'}`}
        >
          <LayoutDashboard size={22} />
          <span className="text-[10px] font-medium mt-1">Home</span>
        </button>
        <button
          onClick={() => setCurrentView('journey')}
          className={`flex flex-col items-center p-2 rounded-lg ${currentView === 'journey' ? 'text-cyan-600' : 'text-gray-400'}`}
        >
          <Map size={22} />
          <span className="text-[10px] font-medium mt-1">Journey</span>
        </button>
        <button
          onClick={() => setCurrentView('entries')}
          className={`flex flex-col items-center p-2 rounded-lg ${currentView === 'entries' ? 'text-cyan-600' : 'text-gray-400'}`}
        >
          <ClipboardList size={22} />
          <span className="text-[10px] font-medium mt-1">Entries</span>
        </button>
      </div>
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
      `}</style>
    </div>
  );
};

export default App;
