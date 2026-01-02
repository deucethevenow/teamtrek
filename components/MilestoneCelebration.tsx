import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X, Target, TrendingUp } from 'lucide-react';

interface MilestoneCelebrationProps {
  grandPrize: {
    emoji: string;
    title: string;
    description: string;
  };
  totalSteps: number;
  triggeredBy?: {
    username: string;
    avatar_emoji: string;
  };
  onClose: () => void;
}

// Confetti piece component
const ConfettiPiece: React.FC<{
  color: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  isCircle: boolean;
}> = ({ color, left, delay, duration, size, isCircle }) => (
  <div
    className="absolute animate-confetti-fall"
    style={{
      left: `${left}%`,
      top: '-20px',
      width: size,
      height: size,
      backgroundColor: color,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      borderRadius: isCircle ? '50%' : '0',
      transform: `rotate(${Math.random() * 360}deg)`
    }}
  />
);

// Confetti Effect Component
const ConfettiEffect: React.FC = () => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'];
  const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 10,
    isCircle: Math.random() > 0.5
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[101]">
      {confettiPieces.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </div>
  );
};

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  grandPrize,
  totalSteps,
  triggeredBy,
  onClose
}) => {
  const [confettiActive, setConfettiActive] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger content animation after a brief delay
    const contentTimer = setTimeout(() => setShowContent(true), 100);

    // Auto-disable confetti after 6 seconds for performance
    const confettiTimer = setTimeout(() => setConfettiActive(false), 6000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(confettiTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Confetti Layer */}
      {confettiActive && <ConfettiEffect />}

      {/* Modal */}
      <div
        className={`bg-white rounded-3xl p-8 max-w-lg mx-4 shadow-2xl relative overflow-hidden transition-all duration-500 ${
          showContent ? 'animate-bounce-in opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Golden glow background */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-yellow-200/60 via-yellow-100/30 to-transparent" />

        {/* Decorative sparkles */}
        <div className="absolute top-6 left-6 text-yellow-400 animate-pulse">
          <Sparkles size={24} />
        </div>
        <div className="absolute top-6 right-16 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <Sparkles size={20} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Trophy animation */}
          <div className="relative inline-block">
            <div className="text-8xl mb-2 animate-bounce" style={{ animationDuration: '1s' }}>
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto drop-shadow-lg" />
            </div>
            <div className="absolute -top-2 -right-2 text-3xl animate-ping" style={{ animationDuration: '2s' }}>
              ✨
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
            HALFWAY THERE!
          </h2>

          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-1 rounded-full text-sm font-bold mb-4">
            <Target size={16} />
            50% MILESTONE UNLOCKED
          </div>

          <p className="text-lg text-gray-600 mb-2">
            The team hit <span className="font-bold text-cyan-600">{totalSteps.toLocaleString()}</span> steps!
          </p>

          {triggeredBy && (
            <p className="text-sm text-gray-500 mb-4">
              {triggeredBy.avatar_emoji} <span className="font-medium">{triggeredBy.username}</span> pushed us over the line!
            </p>
          )}

          {/* Grand Prize Reveal */}
          <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-300 mb-6 shadow-inner">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="text-yellow-500" size={18} />
              <span className="text-xs font-bold text-yellow-700 uppercase tracking-widest">
                Grand Prize Revealed
              </span>
              <Sparkles className="text-yellow-500" size={18} />
            </div>

            <p className="text-xs text-gray-500 italic mb-2">No, it's not a beach vacation... 🏖️</p>

            <div className="text-5xl mb-2 drop-shadow-sm">💪 OR 🧘</div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">YOUR CHOICE:</h3>

            <div className="space-y-3 text-left">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="font-bold text-gray-800">💪 BowFlex Dumbbells</p>
                <p className="text-xs text-gray-600">15 sets of weights in ONE! 5-52.5 lbs. Basically a gym under your desk.</p>
              </div>
              <div className="text-gray-400 text-xs font-bold">— OR —</div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="font-bold text-gray-800">🧘 3 Premium Massages</p>
                <p className="text-xs text-gray-600">Three 60-min sessions. Your legs walked 2M+ steps - they deserve royalty treatment!</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-yellow-200">
              <div className="flex items-center justify-center gap-1 text-xs text-yellow-700">
                <TrendingUp size={14} />
                <span>Hit 70% of your personal goal to enter! 🎟️</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Let's Finish Strong! 🚀
          </button>

          <p className="text-xs text-gray-400 mt-3">
            Only 1,085,000 more steps to go!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MilestoneCelebration;
