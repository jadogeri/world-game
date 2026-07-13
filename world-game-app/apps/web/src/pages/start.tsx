import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Trophy, ArrowRight } from 'lucide-react';
import { Difficulty } from '@repo/api-client-react';
import globeLogo from '../assets/globe-logo.png';
import { ThemeToggle } from '../components/theme-toggle';

export default function StartPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState(sessionStorage.getItem('playerName') || '');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    sessionStorage.setItem('playerName', name.trim());
    sessionStorage.setItem('difficulty', difficulty);
    
    setLocation('/play');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background hex-bg p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative background globes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] aspect-square rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] aspect-square rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <img src={globeLogo} alt="World Game Globe" className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl mb-4" />
          <h1 className="text-5xl font-extrabold font-serif text-foreground tracking-tight mb-2 uppercase drop-shadow-sm">
            World <span className="text-primary">Game</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            The Ultimate Geography Quiz Show
          </p>
        </div>

        <div className="bg-card broadcast-shadow rounded-2xl p-8 border border-border">
          <form onSubmit={handleStart} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-bold text-foreground uppercase tracking-wider">
                Contender Name
              </label>
              <input
                id="playerName"
                type="text"
                required
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-lg placeholder:text-muted-foreground/50"
                data-testid="input-player-name"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground uppercase tracking-wider block">
                Select Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-3 px-2 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all
                      ${difficulty === diff 
                        ? 'bg-primary text-primary-foreground border-primary shadow-md transform scale-105' 
                        : 'bg-card text-muted-foreground border-border hover:bg-muted hover:border-primary/50'
                      }`}
                    data-testid={`btn-difficulty-${diff}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-4 px-6 gold-gradient text-black font-extrabold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 uppercase tracking-wide"
              data-testid="button-start-game"
            >
              Start Game <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setLocation('/leaderboard')}
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary/80 transition-colors"
            data-testid="link-leaderboard"
          >
            <Trophy size={18} />
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}