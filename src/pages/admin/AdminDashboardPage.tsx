
import { DashboardStats } from "@/components/DashboardStats";
import { RecentPanels } from "@/components/RecentPanels";
import { QuickActions } from "@/components/QuickActions";

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de votre plateforme PanelFlow
        </p>
      </div>

      <DashboardStats />

      <div className="grid gap-6 md:grid-cols-3">
        <RecentPanels />
        <QuickActions />
      </div>
    </div>
  );
}
