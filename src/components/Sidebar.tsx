
import { NavLink, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Calendar, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Play,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Panels", url: "/panels", icon: Calendar },
  { title: "Modérateurs", url: "/moderators", icon: UserCheck },
  { title: "Sessions Live", url: "/live", icon: Play },
  { title: "Participants", url: "/participants", icon: Users },
  { title: "Questions", url: "/questions", icon: MessageSquare },
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform bg-card border-r transition-transform duration-300 ease-in-out md:relative md:top-0 md:h-screen md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        !isOpen && "md:w-16"
      )}>
        <div className="flex h-full flex-col">
          {/* Toggle button */}
          <div className="hidden md:flex justify-end p-2">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => {
              const isActive = currentPath === item.url;
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isOpen && "md:justify-center md:px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {(isOpen || isMobile) && (
                    <span className="truncate">{item.title}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          {isOpen && (
            <div className="border-t p-4">
              <div className="text-xs text-muted-foreground">
                <p>PanelFlow v1.0.0</p>
                <p>© 2024 Tous droits réservés</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
