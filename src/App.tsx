import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => {
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
              {/* <Route path="notes" element={<UserNotes />} />
              <Route path="history" element={<UserHistory />} /> */}
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
            


            {/* Route publique pour les questions */}
            <Route path="/panel/:panelId/questions" element={<QuestionsWrapper />} />

            {/* Route 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;