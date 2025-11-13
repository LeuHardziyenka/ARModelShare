import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

// Page Containers
import LoginContainer from "@/pages/LoginContainer";
import DashboardContainer from "@/pages/DashboardContainer";
import UploadContainer from "@/pages/UploadContainer";
import ShareManagerContainer from "@/pages/ShareManagerContainer";
import AnalyticsContainer from "@/pages/AnalyticsContainer";
import ProfileContainer from "@/pages/ProfileContainer";
import ARViewerContainer from "@/pages/ARViewerContainer";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user} onSignOut={signOut} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      {/* Public AR Viewer Route */}
      <Route path="/ar">
        {() => <ARViewerContainer />}
      </Route>

      {/* Auth Route */}
      <Route path="/login">
        {() => user ? <Redirect to="/dashboard" /> : <LoginContainer />}
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => user ? (
          <AuthenticatedLayout>
            <DashboardContainer />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/upload">
        {() => user ? (
          <AuthenticatedLayout>
            <UploadContainer />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/share">
        {() => user ? (
          <AuthenticatedLayout>
            <ShareManagerContainer />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/analytics">
        {() => user ? (
          <AuthenticatedLayout>
            <AnalyticsContainer />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/profile">
        {() => user ? (
          <AuthenticatedLayout>
            <ProfileContainer />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      {/* Root redirect */}
      <Route path="/">
        {() => <Redirect to={user ? "/dashboard" : "/login"} />}
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
