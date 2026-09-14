"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { ToasterProvider } from "@/components/ui/toast";
import { LiveTicker } from "@/components/ui/live-ticker";
import { Fireworks } from "@/components/ui/fireworks";
import { useFireworks } from "@/hooks/use-fireworks";
import { useTickerMessages } from "@/hooks/use-ticker-messages";

function TickerWrapper() {
  const { messages } = useTickerMessages();
  return <LiveTicker messages={messages} />;
}

function FireworksWrapper() {
  const { isActive, handleComplete } = useFireworks();
  return <Fireworks isActive={isActive} onComplete={handleComplete} />;
}

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <AuthProvider>
      <ToasterProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <TickerWrapper />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
          </div>
          <FireworksWrapper />
        </div>
      </ToasterProvider>
    </AuthProvider>
  );
}
