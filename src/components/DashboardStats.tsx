
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MessageSquare, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Panels Actifs",
    value: "12",
    description: "+2 depuis hier",
    icon: Calendar,
    trend: "up",
    color: "text-blue-600"
  },
  {
    title: "Participants Total",
    value: "1,247",
    description: "+15% ce mois",
    icon: Users,
    trend: "up",
    color: "text-green-600"
  },
  {
    title: "Questions Posées",
    value: "89",
    description: "Aujourd'hui",
    icon: MessageSquare,
    trend: "neutral",
    color: "text-orange-600"
  },
  {
    title: "Engagement Moyen",
    value: "87%",
    description: "+5% vs mois précédent",
    icon: TrendingUp,
    trend: "up",
    color: "text-purple-600"
  }
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              {stat.trend === "up" && (
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  ↗
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
