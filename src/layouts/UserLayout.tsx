import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import {
  LayoutDashboard,
  Mic,
  Calendar,
  MessageSquare,
  Clock,
  Menu,
  X,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const panelistMenuItems = [
    { title: "TABLEAU DE BORD", url: "/dashboard", icon: LayoutDashboard },
    { title: "MES PANELS", url: "/panels", icon: MessageSquare },
    { title: "MES INVITATIONS", url: "/invitations", icon: MessageSquare },
    { title: "MES SESSIONS", url: "/sessions", icon: Mic },
    { title: "PLANNING", url: "/planning", icon: Calendar },
    { title: "MON PROFIL", url: "/profile", icon: User },
]

interface UserLayoutProps {
  children?: React.ReactNode;
}

function CurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: '#0c54a4' }}>
      <Clock className="h-4 w-4" />
      <div className="flex items-baseline gap-1">
        <span className="font-medium">{format(currentTime, "HH:mm", { locale: fr })}</span>
        <span className="text-xs opacity-80">
          {format(currentTime, "EEE d", { locale: fr })}
        </span>
      </div>
    </div>
  );
}

export function UserLayout({ children }: UserLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { user } = useUser();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
    });
  }, []);

  const menuItems = panelistMenuItems;

  return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          {/* Header spécifique panéliste */}
          <header className="bg-white/90 backdrop-blur-sm border-b border-white/50 sticky top-0 z-40">
              <div className="px-2 sm:px-4 lg:px-6">
                  <div className="flex justify-between items-center h-16">
                      <div className="flex items-center gap-2 sm:gap-4">
                          <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSidebarOpen(!sidebarOpen)}
                              className="lg:hidden"
                              aria-label="Toggle menu"
                          >
                              {sidebarOpen ? (
                                  <X className="h-5 w-5" />
                              ) : (
                                  <Menu className="h-5 w-5" />
                              )}
                          </Button>

                          <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center">
                                  <img
                                    src="/images/ivoiretech.png"
                                    alt="IvoireTech Logo"
                                    className="h-4 sm:h-6 mb-1"
                                  />
                                  <p className="text-xs sm:text-sm" style={{ color: '#19b3d2' }}>
                                      MON ESPACE
                                  </p>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <CurrentTime />
                          <div className="relative group">
                              <button className="flex items-center gap-2 focus:outline-none">
                                  <Avatar className="h-9 w-9">
                                      <AvatarImage src="/avatars/panelist.png" />
                                      <AvatarFallback className="bg-blue-100" style={{ color: '#0c54a4' }}>
                                          <User className="h-4 w-4" />
                                      </AvatarFallback>
                                  </Avatar>
                              </button>
                              <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                  <div className="py-1">
                                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                                          {userEmail}
                                      </div>
                                      <button
                                          onClick={async () => {
                                              const { error } = await supabase.auth.signOut()
                                              if (!error) window.location.href = '/auth/login'
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                          Déconnexion
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </header>

          <div className="flex">
              {/* Sidebar spécifique panéliste */}
              <aside
                  className={cn(
                      "fixed inset-y-0 left-0 z-50 w-56 sm:w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 mt-16 lg:mt-0",
                      sidebarOpen ? "translate-x-0" : "-translate-x-full"
                  )}
              >
                  <nav className="mt-8 px-4 space-y-2">
                      {menuItems.map(item => {
                          const isActive = location.pathname === item.url
                          return (
                              <NavLink
                                  key={item.url}
                                  to={item.url}
                                  className={cn(
                                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                      isActive
                                          ? "text-white shadow-sm"
                                          : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                                  )}
                                  style={isActive ? { background: 'linear-gradient(135deg, #0c54a4, #046eb6)' } : {}}
                                  onClick={() => setSidebarOpen(false)}
                              >
                                  <item.icon className="h-5 w-5" />
                                  {item.title}
                              </NavLink>
                          )
                      })}
                  </nav>
              </aside>

              {/* Overlay mobile */}
              {sidebarOpen && (
                  <div
                      className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                      onClick={() => setSidebarOpen(false)}
                  />
              )}

              {/* Contenu principal */}
              <main className="flex-1 w-full px-2 sm:px-4 py-2 sm:py-4 mt-16 lg:mt-0">
                  <Outlet />
              </main>
          </div>
      </div>
  )
}