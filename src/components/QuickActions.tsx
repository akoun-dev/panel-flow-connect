
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Settings, BarChart3 } from "lucide-react";

const quickActions = [
  {
    title: "Créer un Panel",
    description: "Nouveau panel ou conférence",
    icon: Plus,
    action: "create-panel",
    color: "bg-primary hover:bg-primary/90"
  },
  {
    title: "Programmer Session",
    description: "Planifier une session future",
    icon: Calendar,
    action: "schedule-session",
    color: "bg-orange-500 hover:bg-orange-600"
  },
  {
    title: "Inviter Participants",
    description: "Ajouter de nouveaux membres",
    icon: Users,
    action: "invite-users",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    title: "Voir Statistiques",
    description: "Analytics détaillées",
    icon: BarChart3,
    action: "view-analytics",
    color: "bg-purple-500 hover:bg-purple-600"
  }
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions Rapides</CardTitle>
        <CardDescription>
          Accès direct aux fonctionnalités principales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-auto p-4 justify-start hover-lift ${action.color} hover:text-white transition-all duration-200`}
              onClick={() => console.log(`Action: ${action.action}`)}
            >
              <action.icon className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs opacity-80">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
