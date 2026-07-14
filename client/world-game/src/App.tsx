import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import StartPage from './pages/start';
import GamePage from './pages/game';
import LeaderboardPage from './pages/leaderboard';
import { ThemeProvider } from './components/theme-provider';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={StartPage} />
      <Route path="/play" component={GamePage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <h1 className="text-4xl font-bold mb-4 font-serif text-primary">404</h1>
          <p className="text-lg text-muted-foreground">This page doesn't exist.</p>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="world-game-theme">
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;