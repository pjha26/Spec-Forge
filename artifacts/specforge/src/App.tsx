import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import { AuthGate } from "@/components/auth-gate";

const Home = lazy(() => import("@/pages/home"));
const SpecsList = lazy(() => import("@/pages/specs"));
const SpecDetail = lazy(() => import("@/pages/spec-detail"));
const SharedSpec = lazy(() => import("@/pages/shared-spec"));
const TeamsPage = lazy(() => import("@/pages/teams"));
const TeamDetail = lazy(() => import("@/pages/team-detail"));
const SearchPage = lazy(() => import("@/pages/search"));
const GraphPage = lazy(() => import("@/pages/graph"));
const IntegrationsPage = lazy(() => import("@/pages/integrations"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/share/:token" component={SharedSpec} />
      <Route path="/app">
        {() => (
          <AuthGate>
            <Layout>
              <Home />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/specs/:id">
        {() => (
          <AuthGate>
            <Layout>
              <SpecDetail />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/specs">
        {() => (
          <AuthGate>
            <Layout>
              <SpecsList />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/teams/:id">
        {() => (
          <AuthGate>
            <Layout>
              <TeamDetail />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/teams">
        {() => (
          <AuthGate>
            <Layout>
              <TeamsPage />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/search">
        {() => (
          <AuthGate>
            <Layout>
              <SearchPage />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/graph">
        {() => (
          <AuthGate>
            <Layout>
              <GraphPage />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route path="/app/integrations">
        {() => (
          <AuthGate>
            <Layout>
              <IntegrationsPage />
            </Layout>
          </AuthGate>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Suspense fallback={<p className="p-6 text-sm text-muted-foreground" role="status">Loading…</p>}>
              <Router />
            </Suspense>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
