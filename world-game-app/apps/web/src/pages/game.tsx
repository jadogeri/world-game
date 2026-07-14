import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { 
  useGetQuestion, 
  useVerifyAnswer, 
  useUseFiftyFifty,
  useAskAudience,
  useAskExpert,
  useCreateScore,
  getGetQuestionQueryKey,
  Difficulty
} from '@repo/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { LADDER_AMOUNTS, SAFE_HAVENS, TIMERS } from '../lib/constants';
import { Clock, ShieldAlert, Banknote, AlertCircle, EyeOff, Loader2, Trophy, Users, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import globeLogo from '../assets/globe-logo.png';
import { motion } from 'framer-motion';

type GamePhase = 'LOADING' | 'READY' | 'PLAYING' | 'VERIFYING' | 'REVEAL' | 'GAMEOVER' | 'ERROR';

// Memoized so the per-second countdown timer (which re-renders GamePage every
// tick) never re-renders the ladder unless the active level actually changes.
//
// The gold highlight is a single, always-mounted motion.div positioned via
// measured DOM rects (not a conditionally-mounted layoutId element). This
// avoids relying on framer-motion's mount/unmount shared-layout detection —
// which can skip or snap the animation depending on render timing — and
// instead directly animates `top`/`height` with a spring, guaranteeing a
// slow slide between rows every time `level` changes, regardless of what
// else causes the component tree to re-render.
export const MoneyLadder = React.memo(function MoneyLadder({
  level,
  playerName,
  difficulty,
}: {
  level: number;
  playerName: string;
  difficulty: Difficulty;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [highlightRect, setHighlightRect] = useState<{ top: number; height: number } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const row = rowRefs.current.get(level);
    if (!container || !row) return;
    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    setHighlightRect({ top: rowRect.top - containerRect.top, height: rowRect.height });
  }, [level]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="w-full md:w-80 bg-[#020512] border-t md:border-t-0 md:border-l border-blue-900/50 flex flex-col z-20">
      <div className="hidden md:flex p-4 border-b border-blue-900/50 items-center gap-3">
        <img src={globeLogo} alt="Globe" className="w-10 h-10 object-contain drop-shadow-md" />
        <div>
          <h2 className="font-serif font-bold text-xl tracking-widest uppercase text-white/90">World <span className="text-blue-500">Game</span></h2>
          <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">{playerName} • {difficulty}</p>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden p-2 md:p-4 flex flex-col-reverse md:flex-col gap-0.5 relative">
        {highlightRect && (
          <motion.div
            className="absolute left-2 right-2 md:left-4 md:right-4 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 rounded shadow-[0_0_15px_rgba(245,158,11,0.6)] z-0 pointer-events-none"
            initial={false}
            animate={{ top: highlightRect.top, height: highlightRect.height }}
            transition={{
              type: "spring",
              stiffness: 35,
              damping: 12,
              mass: 1.5,
            }}
          />
        )}
        {[...LADDER_AMOUNTS].reverse().map((amt, revIdx) => {
          const actualLevel = 15 - revIdx;
          const isActive = level === actualLevel;
          const isPassed = level > actualLevel;
          const isSafeHaven = SAFE_HAVENS.includes(actualLevel);

          return (
            <div
              key={actualLevel}
              ref={(el) => {
                if (el) rowRefs.current.set(actualLevel, el);
                else rowRefs.current.delete(actualLevel);
              }}
              className={cn(
                "flex-1 min-h-0 flex items-center justify-between px-3 md:px-4 rounded relative z-10 transition-colors duration-500",
                isActive ? "text-black font-extrabold" :
                isPassed ? "text-amber-500/80 font-bold" :
                isSafeHaven ? "text-white font-bold" :
                "text-blue-300/60 font-medium"
              )}
              data-testid={isActive ? `ladder-active-level-${actualLevel}` : undefined}
            >
              <div className="relative z-10 flex items-center gap-2 md:gap-3 w-10 md:w-12">
                <span className="text-[10px] md:text-xs font-bold">{actualLevel}</span>
                {isSafeHaven && !isActive && <ShieldAlert size={12} className={isPassed ? "text-amber-500/80" : "text-white"} />}
              </div>
              <div className={cn(
                "relative z-10 font-serif tracking-tight text-right flex-1 truncate",
                isActive ? "text-lg md:text-xl font-extrabold" : "text-base md:text-lg"
              )}>
                ${amt.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function GamePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Game Configuration State
  const [playerName] = useState(() => sessionStorage.getItem('playerName') || 'Player');
  const [difficulty] = useState<Difficulty>(() => (sessionStorage.getItem('difficulty') as Difficulty) || 'easy');
  
  // Game Progression State
  const [level, setLevel] = useState(1); // 1 to 15
  const [phase, setPhase] = useState<GamePhase>('LOADING');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedAskAudience, setUsedAskAudience] = useState(false);
  const [usedAskExpert, setUsedAskExpert] = useState(false);

  // Lifeline UI/effect state
  const [audiencePercentages, setAudiencePercentages] = useState<number[] | null>(null);
  const [expertHintIndex, setExpertHintIndex] = useState<number | null>(null);

  // User Action State
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  
  // End Game State
  const [finalWinnings, setFinalWinnings] = useState(0);
  const [isWalkAway, setIsWalkAway] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<'WIN' | 'WRONG' | 'TIMEOUT' | 'WALK_AWAY' | null>(null);

  // APIs
  const { data: question, isLoading: isQuestionLoading, refetch: fetchQuestion } = useGetQuestion(
    { difficulty, level },
    { query: { enabled: false, queryKey: getGetQuestionQueryKey({ difficulty, level }), staleTime: 0 } }
  );

  const verifyMutation = useVerifyAnswer();
  const fiftyFiftyMutation = useUseFiftyFifty();
  const askAudienceMutation = useAskAudience();
  const askExpertMutation = useAskExpert();
  const scoreMutation = useCreateScore();

  const timerRef = useRef<number | null>(null);

  // Setup / Next Level
  useEffect(() => {
    if (phase === 'LOADING') {
      setHiddenOptions([]);
      setSelectedIndex(null);
      setCorrectIndex(null);
      setAudiencePercentages(null);
      setExpertHintIndex(null);
      fetchQuestion().then((result) => {
        if (result.error || !result.data) {
          setPhase('ERROR');
          return;
        }
        setTimeLeft(TIMERS[difficulty]);
        setPhase('READY');
        // Small delay to show ready state before starting timer
        setTimeout(() => setPhase('PLAYING'), 1000);
      });
    }
  }, [phase, level, difficulty, fetchQuestion]);

  // Redirect if no player name
  useEffect(() => {
    if (!sessionStorage.getItem('playerName')) {
      setLocation('/');
    }
  }, [setLocation]);

  // Timer Logic
  useEffect(() => {
    if (phase === 'PLAYING') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleTimeout = useCallback(() => {
    if (phase !== 'PLAYING') return;
    setPhase('VERIFYING');
    setSelectedIndex(-1); // -1 indicates timeout
    
    // Fallback: verify with 0 index just to get the correct answer to show, but treat as wrong
    if (question) {
      verifyMutation.mutate(
        { data: { token: question.token, selectedIndex: 0 } },
        {
          onSuccess: (result) => {
            setCorrectIndex(result.correctIndex);
            endGame('TIMEOUT');
          },
          onError: () => endGame('TIMEOUT') // Fallback if verify fails
        }
      );
    }
  }, [phase, question, verifyMutation]);

  const handleSelectAnswer = (index: number) => {
    if (phase !== 'PLAYING') return;
    setPhase('VERIFYING');
    setSelectedIndex(index);

    if (question) {
      verifyMutation.mutate(
        { data: { token: question.token, selectedIndex: index } },
        {
          onSuccess: (result) => {
            setCorrectIndex(result.correctIndex);
            setPhase('REVEAL');
            
            setTimeout(() => {
              if (result.correct) {
                if (level === 15) {
                  endGame('WIN');
                } else {
                  setLevel(l => l + 1);
                  setPhase('LOADING');
                }
              } else {
                endGame('WRONG');
              }
            }, 3000); // 3 seconds to show reveal
          },
          onError: () => {
             // In case of error, just consider it wrong to prevent soft lock
             endGame('WRONG');
          }
        }
      );
    }
  };

  const handleFiftyFifty = () => {
    if (phase !== 'PLAYING' || usedFiftyFifty || !question) return;
    setUsedFiftyFifty(true);
    fiftyFiftyMutation.mutate(
      { data: { token: question.token } },
      {
        onSuccess: (res) => {
          setHiddenOptions(res.removeIndices);
        }
      }
    );
  };

  // Ask the Audience: pauses the countdown while the "studio" votes, then
  // resumes it once results are in — mirroring the show's format where the
  // clock stops during the vote.
  const handleAskAudience = () => {
    if (phase !== 'PLAYING' || usedAskAudience || !question) return;
    setUsedAskAudience(true);
    setPhase('VERIFYING'); // pause the countdown timer during the "vote"
    askAudienceMutation.mutate(
      { data: { token: question.token } },
      {
        onSuccess: (res) => {
          setAudiencePercentages(res.percentages);
          setPhase('PLAYING');
        },
        onError: () => setPhase('PLAYING'),
      }
    );
  };

  // Ask the Expert: reveals which option the expert recommends (always the
  // correct one) as a highlighted hint; the player still has to click it.
  const handleAskExpert = () => {
    if (phase !== 'PLAYING' || usedAskExpert || !question) return;
    setUsedAskExpert(true);
    askExpertMutation.mutate(
      { data: { token: question.token } },
      {
        onSuccess: (res) => {
          setExpertHintIndex(res.correctIndex);
        }
      }
    );
  };

  const calculateWinnings = (reason: 'WIN' | 'WRONG' | 'TIMEOUT' | 'WALK_AWAY', currentLevel: number) => {
    if (reason === 'WIN') return LADDER_AMOUNTS[14];
    if (reason === 'WALK_AWAY') return currentLevel > 1 ? LADDER_AMOUNTS[currentLevel - 2] : 0;
    
    // WRONG or TIMEOUT (Safe haven logic)
    const levelIndex = currentLevel - 1;
    if (levelIndex < SAFE_HAVENS[0] - 1) return 0; // below level 5
    if (levelIndex >= SAFE_HAVENS[0] - 1 && levelIndex < SAFE_HAVENS[1] - 1) return LADDER_AMOUNTS[SAFE_HAVENS[0] - 1]; // $1,000
    return LADDER_AMOUNTS[SAFE_HAVENS[1] - 1]; // $32,000
  };

  const endGame = useCallback((reason: 'WIN' | 'WRONG' | 'TIMEOUT' | 'WALK_AWAY') => {
    const finalAmt = calculateWinnings(reason, level);
    setFinalWinnings(finalAmt);
    setGameOverReason(reason);
    setPhase('GAMEOVER');

    // Automatically save score
    scoreMutation.mutate({
      data: {
        playerName,
        difficulty,
        winnings: finalAmt,
        questionsAnswered: reason === 'WIN' ? 15 : level - 1,
        correctAnswers: reason === 'WIN' ? 15 : level - 1,
        won: reason === 'WIN'
      }
    });
  }, [level, playerName, difficulty, scoreMutation]);

  const handleWalkAway = () => {
    if (phase !== 'PLAYING') return;
    setPhase('VERIFYING');
    endGame('WALK_AWAY');
  };

  if (phase === 'GAMEOVER') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background hex-bg p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-0" />
        
        <div className="z-10 max-w-lg w-full bg-card broadcast-shadow border border-border rounded-2xl p-8 text-center">
          {gameOverReason === 'WIN' && (
            <div className="mb-6">
              <Trophy className="mx-auto text-yellow-500 w-20 h-20 mb-4 animate-bounce" />
              <h1 className="text-4xl font-serif font-bold text-yellow-600 mb-2">MILLIONAIRE!</h1>
              <p className="text-muted-foreground text-lg">Incredible run, {playerName}!</p>
            </div>
          )}
          
          {gameOverReason === 'WALK_AWAY' && (
            <div className="mb-6">
              <Banknote className="mx-auto text-green-500 w-16 h-16 mb-4" />
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Smart Choice</h1>
              <p className="text-muted-foreground text-lg">You walked away with your head held high.</p>
            </div>
          )}

          {gameOverReason === 'WRONG' && (
            <div className="mb-6">
              <AlertCircle className="mx-auto text-destructive w-16 h-16 mb-4" />
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Incorrect</h1>
              <p className="text-muted-foreground text-lg">Your journey ends here.</p>
            </div>
          )}

          {gameOverReason === 'TIMEOUT' && (
            <div className="mb-6">
              <Clock className="mx-auto text-orange-500 w-16 h-16 mb-4" />
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Time's Up!</h1>
              <p className="text-muted-foreground text-lg">You ran out of time.</p>
            </div>
          )}

          <div className="my-8 p-6 bg-muted/50 rounded-xl border border-border">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Final Winnings</p>
            <p className="text-5xl font-serif font-extrabold text-green-600 tracking-tight" data-testid="text-final-winnings">
              ${finalWinnings.toLocaleString()}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setLevel(1);
                setUsedFiftyFifty(false);
                setUsedAskAudience(false);
                setUsedAskExpert(false);
                setPhase('LOADING');
              }}
              className="py-3 px-6 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg"
              data-testid="btn-play-again"
            >
              Play Again
            </button>
            <button
              onClick={() => setLocation('/leaderboard')}
              className="py-3 px-6 bg-card text-foreground border border-border font-bold rounded-xl hover:bg-muted transition-colors"
              data-testid="btn-view-leaderboard"
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ERROR') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050A1F] text-slate-100 p-4">
        <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
        <h1 className="text-2xl font-serif font-bold mb-2">Couldn't load your question</h1>
        <p className="text-slate-400 mb-6">Something went wrong reaching the game server.</p>
        <button
          onClick={() => setPhase('LOADING')}
          className="py-3 px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg"
          data-testid="btn-retry-question"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentAmount = LADDER_AMOUNTS[level - 1];

  return (
    <div className="min-h-screen w-full bg-[#050A1F] text-slate-100 flex flex-col md:flex-row overflow-hidden relative font-sans">
      {/* Background Lighting */}
      <div className="absolute top-[-20%] left-[20%] w-[60%] aspect-square rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] aspect-square rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none" />

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col relative z-10 p-4 md:p-8 h-screen overflow-y-auto">
        
        {/* Header (Mobile Logo + Lifelines) */}
        <div className="flex justify-between items-center mb-8">
          <div className="md:hidden flex items-center gap-2">
            <img src={globeLogo} alt="Globe" className="w-8 h-8 object-contain" />
            <div className="font-serif font-bold text-xl tracking-widest uppercase text-white/80">
              World <span className="text-blue-400">Game</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-4 ml-auto justify-end">
            <button
              onClick={handleFiftyFifty}
              disabled={usedFiftyFifty || phase !== 'PLAYING'}
              className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border-2 font-bold tracking-wider uppercase text-xs md:text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                usedFiftyFifty 
                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50" 
                  : "bg-blue-900/50 border-blue-500 text-blue-100 hover:bg-blue-800 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] cursor-pointer"
              )}
              data-testid="btn-lifeline-5050"
            >
              <EyeOff size={16} /> 50:50
            </button>
            <button
              onClick={handleAskAudience}
              disabled={usedAskAudience || phase !== 'PLAYING'}
              className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border-2 font-bold tracking-wider uppercase text-xs md:text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                usedAskAudience
                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-purple-900/50 border-purple-500 text-purple-100 hover:bg-purple-800 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] cursor-pointer"
              )}
              data-testid="btn-lifeline-audience"
            >
              <Users size={16} /> Audience
            </button>
            <button
              onClick={handleAskExpert}
              disabled={usedAskExpert || phase !== 'PLAYING'}
              className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border-2 font-bold tracking-wider uppercase text-xs md:text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                usedAskExpert
                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-indigo-900/50 border-indigo-500 text-indigo-100 hover:bg-indigo-800 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] cursor-pointer"
              )}
              data-testid="btn-lifeline-expert"
            >
              <GraduationCap size={16} /> Expert
            </button>
            <button
              onClick={handleWalkAway}
              disabled={phase !== 'PLAYING' || level === 1}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold tracking-wider uppercase text-sm transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                phase !== 'PLAYING' || level === 1
                  ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-amber-900/50 border-amber-500 text-amber-100 hover:bg-amber-800 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer"
              )}
              data-testid="btn-walk-away"
            >
              <Banknote size={16} /> Walk Away
            </button>
          </div>
        </div>

        {/* Center Stage: Question and Timer */}
        <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full">
          
          {/* Timer */}
          <div className="mb-10 relative flex justify-center items-center">
            <div className={cn(
              "w-24 h-24 rounded-full border-4 flex items-center justify-center bg-[#050A1F] shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-colors duration-1000",
              timeLeft <= 5 ? "border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]" :
              timeLeft <= 10 ? "border-amber-500 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]" :
              "border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            )}>
              <span className="text-4xl font-serif font-bold tracking-tighter" data-testid="text-timer">
                {phase === 'LOADING' || phase === 'READY' ? '--' : timeLeft}
              </span>
            </div>
          </div>

          {/* Question Box */}
          <div className="w-full relative mb-8">
            <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-full" />
            <div className="relative border-y-2 border-blue-500/50 bg-[#0A1128]/90 backdrop-blur-sm py-8 px-6 md:px-12 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              {phase === 'LOADING' ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold tracking-widest text-blue-400 uppercase mb-4">
                    Question {level} for ${currentAmount.toLocaleString()}
                  </p>
                  
                  {question?.flagImage && (
                    <div className="mb-6 flex justify-center">
                      <img src={question.flagImage} alt="Flag" className="h-32 border-2 border-white/20 shadow-lg object-contain bg-white/5 p-2 rounded" />
                    </div>
                  )}
                  
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-medium leading-tight text-white drop-shadow-md" data-testid="text-question-prompt">
                    {question?.prompt}
                  </h2>
                </>
              )}
            </div>
          </div>

          {/* Options Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {question?.options.map((opt, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              const isSelected = selectedIndex === idx;
              const isCorrect = correctIndex === idx;
              const isRevealed = phase === 'REVEAL';
              const isExpertPick = expertHintIndex === idx && !isRevealed;
              
              let stateClass = "border-blue-500/30 text-blue-100 hover:border-blue-400 hover:bg-blue-600/20";
              
              if (phase === 'VERIFYING' && isSelected) {
                stateClass = "border-amber-400 bg-amber-500/20 text-amber-100 animate-pulse";
              } else if (isRevealed) {
                if (isCorrect) {
                  stateClass = "border-green-500 bg-green-500/30 text-green-100 shadow-[0_0_20px_rgba(34,197,94,0.5)]";
                } else if (isSelected && !isCorrect) {
                  stateClass = "border-red-500 bg-red-500/30 text-red-100";
                } else {
                  stateClass = "border-blue-500/10 text-blue-100/50 opacity-50";
                }
              } else if (isExpertPick) {
                stateClass = "border-indigo-400 bg-indigo-500/20 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.5)]";
              }

              if (isHidden) {
                return (
                  <div key={idx} className="relative border-2 border-transparent bg-transparent py-4 px-6 opacity-0" />
                );
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={phase !== 'PLAYING'}
                  className={cn(
                    "relative border-2 py-4 px-6 text-left text-lg md:text-xl font-medium transition-all duration-300 flex items-center gap-4 bg-[#0A1128]/80 backdrop-blur-sm question-box",
                    stateClass,
                    phase !== 'PLAYING' && !isSelected && !isCorrect && "cursor-default opacity-80"
                  )}
                  data-testid={`btn-option-${idx}`}
                >
                  <span className="text-blue-500 font-bold font-serif w-6">{String.fromCharCode(65 + idx)}:</span>
                  <span className="flex-1 drop-shadow-sm">{opt}</span>
                  {isExpertPick && (
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                      <GraduationCap size={14} /> Expert pick
                    </span>
                  )}
                  {audiencePercentages && !isRevealed && (
                    <div className="absolute left-0 bottom-0 h-1.5 bg-purple-400/70 rounded-b" style={{ width: `${audiencePercentages[idx]}%` }} />
                  )}
                  {audiencePercentages && !isRevealed && (
                    <span className="text-sm font-bold text-purple-300" data-testid={`text-audience-pct-${idx}`}>
                      {audiencePercentages[idx]}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Sidebar: Money Ladder */}
      <MoneyLadder level={level} playerName={playerName} difficulty={difficulty} />

    </div>
  );
}