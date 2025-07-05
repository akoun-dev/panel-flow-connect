import {
  CalendarDays,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
} from "lucide-react";

export const STATUS_CONFIG = {
  draft: {
    label: "Brouillon",
    color: "bg-muted text-muted-foreground border-border",
    dotColor: "bg-muted",
    icon: AlertCircle,
    calendarColor: "hsl(var(--muted))",
    gradient: "from-muted to-muted"
  },
  scheduled: {
    label: "Programmé",
    color: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary",
    icon: CalendarDays,
    calendarColor: "hsl(var(--primary))",
    gradient: "from-primary/10 to-primary/20"
  },
  live: {
    label: "En cours",
    color: "bg-secondary/10 text-secondary border-secondary/20",
    dotColor: "bg-secondary",
    icon: Zap,
    calendarColor: "hsl(var(--secondary))",
    gradient: "from-secondary/10 to-secondary/20"
  },
  confirmed: {
    label: "Confirmé",
    color: "bg-secondary/10 text-secondary border-secondary/20",
    dotColor: "bg-secondary",
    icon: CheckCircle,
    calendarColor: "hsl(var(--secondary))",
    gradient: "from-secondary/10 to-secondary/20"
  },
  pending: {
    label: "En attente",
    color: "bg-accent/10 text-accent border-accent/20",
    dotColor: "bg-accent",
    icon: AlertCircle,
    calendarColor: "hsl(var(--accent))",
    gradient: "from-accent/10 to-accent/20"
  },
  cancelled: {
    label: "Annulé",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
    icon: XCircle,
    calendarColor: "hsl(var(--destructive))",
    gradient: "from-destructive/10 to-destructive/20"
  },
  completed: {
    label: "Terminé",
    color: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary",
    icon: CheckCircle,
    calendarColor: "hsl(var(--primary))",
    gradient: "from-primary/10 to-primary/20"
  }
} as const;

export type PanelStatus = keyof typeof STATUS_CONFIG;
