import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminPanelsPage } from "@/pages/admin/AdminPanelsPage";
import { default as AdminPanelRegistration } from "@/pages/admin/AdminPanelRegistration";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { ResetPassword } from "@/pages/auth/ResetPassword";
import { UserDashboard } from "@/pages/user/UserDashboard";
import { UserPanels } from "@/pages/user/UserPanels";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/layouts/AdminLayout";
import { UserLayout } from "@/layouts/UserLayout"
import { UserSessions } from "@/pages/user/UserSessions"
import UserSchedule from "@/pages/user/UserSchedule"
import { UserNotes } from "@/pages/user/UserNotes";
import { UserHistory } from "@/pages/user/UserHistory";
import UserProfile from "./pages/user/UserProfile";
import Home from "./pages/Home";
import { UserInvitation } from "./pages/user/UserInvitation";
import UserPanelQuestions from "./pages/user/UserPanelQuestions";
import QuestionsWrapper from "@/components/QuestionsWrapper";
import UserPlanning from "./pages/user/UserPlanning";
import Questions from "./pages/Questions";
import JoinPanel from "./pages/JoinPanel";
import Projection from "./pages/Projection";
import PollPage from "./pages/PollPage";
import PanelPollsPage from "./pages/PanelPollsPage";

import ProjectionWrapper from "@/components/ProjectionWrapper";

const queryClient = new QueryClient();

// Fonction utilitaire pour détecter tous les dashboards
const isDashboard = (path) => {
  return (
    path === "/" ||
    path === "/dashboard" ||
    path === "/admin/dashboard"
  );
};

const isNative = () =>
  !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isPluginAvailable?.('App'));

const App = () => {
  useEffect(() => {
    if (!isNative()) return;

    const handler = CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      const path = window.location.pathname;
      if (isDashboard(path)) {
        // Dialog natif Capacitor (meilleure UX mobile)
        const result = await Dialog.confirm({
          title: "Quitter l'application",
          message: "Voulez-vous vraiment quitter l'application ?",
          okButtonTitle: "Quitter",
          cancelButtonTitle: "Annuler"
        });
        if (result.value) {
          CapacitorApp.exitApp();
        }
        // On stoppe ici, rien d'autre à faire
        return;
      }

      // Autres routes
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Routes d'authentification */}
            <Route path="/" element={<Login />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />

            {/* Route utilisateur */}
            <Route element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="panels" element={<UserPanels />} />
              <Route path="planning" element={<UserPlanning />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="invitations" element={<UserInvitation />} />
              <Route path="panel-questions" element={<UserPanelQuestions />} />
            </Route>

            {/* Routes admin avec AdminLayout */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboardPage />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="panels" element={<AdminPanelsPage />} />
              <Route path="panels/new" element={<AdminPanelRegistration />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>
            
            {/* Routes publiques pour les panels */}
            <Route path="/panel/:panelId/questions" element={<QuestionsWrapper />} />
            <Route path="/panel/:panelId/projection" element={<ProjectionWrapper />} />
            <Route path="/panel/:panelId/polls" element={<PanelPollsPage />} />
            <Route path="/panel/join" element={<JoinPanel />} />
            <Route path="/poll/:pollId" element={<PollPage />} />
            {/* Route 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;