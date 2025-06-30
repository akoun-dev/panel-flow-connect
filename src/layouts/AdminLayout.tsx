import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Users,
  Settings,
  PanelLeft,
  FileText,
  Shield,
  Menu,
  X,
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const adminMenuItems = [
  { title: "Tableau de bord", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Panels", url: "/admin/panels", icon: PanelLeft },
  { title: "Rapports", url: "/admin/reports", icon: FileText },
  { title: "Modérateurs", url: "/admin/moderators", icon: Shield },
  { title: "Utilisateurs", url: "/admin/users", icon: Users },
  { title: "Mon Profil", url: "/admin/profile", icon: User },
  { title: "Paramètres", url: "/admin/settings", icon: Settings },

]

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header spécifique admin */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-blue-900">Administrateur</h1>
                  <p className="text-sm text-blue-600">Espace administration</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                Admin
              </Badge>
              <Avatar className="h-9 w-9">
                <AvatarImage src="/avatars/admin.png" />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar spécifique admin */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-sm border-r border-blue-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="mt-8 px-4 space-y-2">
            {adminMenuItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-blue-100 text-blue-700 shadow-sm" 
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </NavLink>
              );
            })}
          </nav>

          {/* Info système */}
          <div className="mt-8 mx-4 p-4 bg-blue-100 rounded-xl">
            <h3 className="font-semibold text-blue-900 text-sm mb-2">Statut système</h3>
            <p className="text-xs text-blue-700 mb-2">Tout fonctionne normalement</p>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <span>Version 1.0.0</span>
            </div>
          </div>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Contenu principal */}
        <main className="flex-1 w-full">
          <div className="h-full p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
