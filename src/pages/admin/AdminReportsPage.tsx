import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">
            Statistiques et analyses de la plateforme
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Exporter les données
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">1,342</div>
            <p className="text-sm text-muted-foreground mt-2">+12% vs mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panels créés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">48</div>
            <p className="text-sm text-muted-foreground mt-2">+5% vs mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taux de participation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">78%</div>
            <p className="text-sm text-muted-foreground mt-2">+3% vs mois dernier</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports détaillés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Rapport d'activité mensuel</h3>
                <p className="text-sm text-muted-foreground">Données consolidées pour juin 2024</p>
              </div>
              <Button variant="outline" size="sm">
                Télécharger
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Rapport des utilisateurs</h3>
                <p className="text-sm text-muted-foreground">Statistiques d'inscription et d'activité</p>
              </div>
              <Button variant="outline" size="sm">
                Télécharger
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}