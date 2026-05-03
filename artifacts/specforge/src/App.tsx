import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SpecsList from "@/pages/specs";
import SpecDetail from "@/pages/spec-detail";
import Landing from "@/pages/landing";
import SharedSpec from "@/pages/shared-spec";
import TeamsPage from "@/pages/teams";
import TeamDetail from "@/pages/team-detail";
import SearchPage from "@/pages/search";
import GraphPage from "@/pages/graph";
import IntegrationsPage from "@/pages/integrations";
import { AuthGate } from "@/components/auth-gate";

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
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
