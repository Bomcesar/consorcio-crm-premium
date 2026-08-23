"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { ToasterProvider } from "@/components/ui/toast";

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
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </ToasterProvider>
    </AuthProvider>
  );
}
