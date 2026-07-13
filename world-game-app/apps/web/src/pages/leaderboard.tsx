import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useListTopScores } from '@repo/api-client-react';
import { Trophy, ArrowLeft, Loader2, Medal, Search, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from '../components/theme-toggle';

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type SortKey = 'rank' | 'winnings' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDate(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function LeaderboardPage() {
  const [, setLocation] = useLocation();
  const { data: scores, isLoading, isError } = useListTopScores({ limit: 100 }, { query: { queryKey: ['top-scores'] } });

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filteredScores = useMemo(() => {
    if (!scores) return [];

    // Rank is always determined by winnings among the full set, before filtering/sorting for display.
    // Tied winnings share the same rank (standard "competition ranking"); ties break deterministically
    // by earliest date so the order is stable across renders.
    const sorted = [...scores].sort((a, b) => {
      if (b.winnings !== a.winnings) return b.winnings - a.winnings;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    let lastWinnings: number | null = null;
    let lastRank = 0;
    const ranked = sorted.map((score, index) => {
      const rank = score.winnings === lastWinnings ? lastRank : index + 1;
      lastWinnings = score.winnings;
      lastRank = rank;
      return { ...score, rank };
    });

    const term = search.trim().toLowerCase();
    let filtered = ranked.filter((score) => {
      const matchesName = term.length === 0 || score.playerName.toLowerCase().includes(term);
      const matchesDifficulty = difficulty === 'all' || score.difficulty === difficulty;
      return matchesName && matchesDifficulty;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered = filtered.sort((a, b) => {
      if (sortKey === 'winnings') return (a.winnings - b.winnings) * dir;
      if (sortKey === 'date') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      return (a.rank - b.rank) * dir;
    });

    return filtered;
  }, [scores, search, difficulty, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredScores.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, difficulty, sortKey, sortDir, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedScores = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredScores.slice(start, start + pageSize);
  }, [filteredScores, currentPage, pageSize]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  }

  return (
    <div className="min-h-screen w-full bg-background hex-bg p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-semibold px-2 md:px-4 py-2 rounded-lg hover:bg-muted"
            data-testid="btn-back-home"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-3">
            <Trophy className="text-accent" size={32} />
            <h1 className="text-3xl md:text-4xl font-extrabold font-serif uppercase tracking-tight text-foreground">
              Hall of <span className="text-primary">Fame</span>
            </h1>
          </div>
          
          <div className="flex items-center md:w-[130px] justify-end">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <label htmlFor="leaderboard-search" className="sr-only">Search by contender name</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="leaderboard-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="input-search-name"
            />
          </div>

          <label htmlFor="leaderboard-difficulty" className="sr-only">Filter by difficulty</label>
          <select
            id="leaderboard-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
            className="px-4 py-2 rounded-lg border border-border bg-card text-foreground capitalize focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="select-difficulty-filter"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="bg-card broadcast-shadow border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 md:gap-4 p-4 md:p-6 bg-muted/50 border-b border-border font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <button
              onClick={() => toggleSort('rank')}
              aria-sort={sortKey === 'rank' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              aria-label={`Sort by rank${sortKey === 'rank' ? `, currently ${sortDir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
              className="col-span-2 md:col-span-1 flex items-center justify-center gap-1 hover:text-foreground transition-colors"
              data-testid="sort-rank"
            >
              Rank <ArrowUpDown size={14} className={cn(sortKey === 'rank' && 'text-primary')} />
            </button>
            <div className="col-span-3 md:col-span-4">Contender</div>
            <div className="col-span-2 text-right hidden md:block">Difficulty</div>
            <button
              onClick={() => toggleSort('winnings')}
              aria-sort={sortKey === 'winnings' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              aria-label={`Sort by winnings${sortKey === 'winnings' ? `, currently ${sortDir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
              className="col-span-3 md:col-span-2 flex items-center justify-end gap-1 hover:text-foreground transition-colors text-right"
              data-testid="sort-winnings"
            >
              Winnings <ArrowUpDown size={14} className={cn(sortKey === 'winnings' && 'text-primary')} />
            </button>
            <button
              onClick={() => toggleSort('date')}
              aria-sort={sortKey === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              aria-label={`Sort by date${sortKey === 'date' ? `, currently ${sortDir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
              className="col-span-4 md:col-span-3 flex items-center justify-end gap-1 hover:text-foreground transition-colors text-right"
              data-testid="sort-date"
            >
              Date <ArrowUpDown size={14} className={cn(sortKey === 'date' && 'text-primary')} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="font-medium animate-pulse">Loading top scores...</p>
            </div>
          ) : isError ? (
            <div className="p-10 text-center text-destructive font-semibold">
              Failed to load leaderboard. Please try again later.
            </div>
          ) : scores?.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground font-medium">
              No scores recorded yet. Be the first!
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground font-medium">
              No scores match your search/filter.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedScores.map((score) => {
                const index = score.rank - 1;
                return (
                <div 
                  key={score.id} 
                  className={cn(
                    "grid grid-cols-12 gap-2 md:gap-4 p-4 md:p-6 items-center transition-colors hover:bg-muted/30",
                    index < 3 ? "font-bold" : "font-medium"
                  )}
                  data-testid={`row-score-${score.id}`}
                >
                  <div className="col-span-2 md:col-span-1 flex justify-center">
                    {index === 0 ? <Medal className="text-yellow-500 dark:text-yellow-400 w-8 h-8" /> :
                     index === 1 ? <Medal className="text-slate-400 dark:text-slate-300 w-7 h-7" /> :
                     index === 2 ? <Medal className="text-amber-700 dark:text-amber-500 w-6 h-6" /> :
                     <span className="text-muted-foreground text-lg">#{score.rank}</span>}
                  </div>
                  
                  <div className="col-span-3 md:col-span-4 flex flex-col min-w-0">
                    <span className={cn(
                      "text-lg truncate",
                      index === 0 ? "text-primary text-xl" : "text-foreground"
                    )}>
                      {score.playerName}
                    </span>
                    <span className={cn(
                      "md:hidden px-1.5 py-0.5 mt-1 rounded-md capitalize border text-xs w-fit",
                      score.difficulty === 'hard' ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900" :
                      score.difficulty === 'medium' ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900" :
                      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900"
                    )}>
                      {score.difficulty}
                    </span>
                    {score.won && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Millionaire</span>
                    )}
                  </div>
                  
                  <div className="col-span-2 text-right text-sm hidden md:block">
                    <span className={cn(
                      "px-2 py-1 rounded-md capitalize border",
                      score.difficulty === 'hard' ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900" :
                      score.difficulty === 'medium' ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900" :
                      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900"
                    )}>
                      {score.difficulty}
                    </span>
                  </div>
                  
                  <div className="col-span-3 md:col-span-2 text-right text-lg md:text-2xl font-serif text-green-600 dark:text-green-400 tracking-tight">
                    ${score.winnings.toLocaleString()}
                  </div>

                  <div className="col-span-4 md:col-span-3 text-right text-xs md:text-sm text-muted-foreground">
                    {formatDate(score.createdAt)}
                  </div>
                </div>
              );})}
            </div>
          )}

          {!isLoading && !isError && filteredScores.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 md:p-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <label htmlFor="leaderboard-page-size" className="whitespace-nowrap">Rows per page</label>
                <select
                  id="leaderboard-page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="select-page-size"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                  className="p-2 rounded-lg border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                  data-testid="btn-first-page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="p-2 rounded-lg border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                  data-testid="btn-prev-page"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="px-3 text-sm font-semibold text-foreground whitespace-nowrap" data-testid="text-page-status">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="p-2 rounded-lg border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                  data-testid="btn-next-page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                  className="p-2 rounded-lg border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                  data-testid="btn-last-page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}