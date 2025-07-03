import { useState } from "react";
import { Mail, Clock, Check, X, Calendar, User, Eye, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useUser } from "../../hooks/useUser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

interface PanelInvitation {
  id: string;
  panel_id: string;
  panelist_email: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  panel?: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    duration?: number;
    category?: string;
    theme?: string;
    moderator_name?: string;
    moderator_email?: string;
    participants_limit?: number;
    tags?: string[];
  };
}

export function UserInvitation() {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedInvitation, setSelectedInvitation] = useState<PanelInvitation | null>(null);

  const { data: invitations, isLoading, refetch } = useQuery<PanelInvitation[]>({
    queryKey: ['my-panel-invitations', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        return [];
      }
      
      try {
        logger.debug('Email utilisateur:', user?.email); // Debug
        if (!user?.email) {
          throw new Error('Email utilisateur non disponible');
        }

        // 1. D'abord récupérer les invitations de base
        const { data: invitations, error: inviteError } = await supabase
          .from('panel_invitations')
          .select('id, panel_id, panelist_email, status, expires_at, created_at')
          .eq('panelist_email', user.email)
          .order('created_at', { ascending: false });

        logger.debug('Invitations de base:', invitations);
        if (inviteError) throw inviteError;
        if (!invitations || invitations.length === 0) return [];

        // 2. Vérifier et récupérer les panels
        const panelIds = invitations.map(inv => inv.panel_id);
        logger.debug('IDs panels recherchés:', panelIds);
        
        // Utilisation de la fonction get_user_panels qui filtre déjà les panels accessibles
        const { data: panels, error: panelError } = await supabase
          .rpc('get_user_panels')
          .select('id, title, description, date, time, duration, category, theme, moderator_name, moderator_email, participants_limit, tags');

        logger.debug('Panels accessibles:', {
          data: panels,
          error: panelError ? {
            message: panelError.message,
            details: panelError.details,
            hint: panelError.hint,
            code: panelError.code
          } : null
        });

        if (panelError) {
          console.error('Erreur RLS détectée:', panelError);
          throw panelError;
        }

        // 3. Fusionner les données (avec gestion des panels manquants)
        const transformedData = invitations.map(invitation => {
          const panel = panels?.find(p => p.id === invitation.panel_id);
          if (!panel) {
            console.warn(`Panel non trouvé pour l'invitation ${invitation.id}`, {
              panel_id: invitation.panel_id,
              invitation
            });
          }
          return {
            ...invitation,
            panel: panel || {
              id: invitation.panel_id,
              title: 'Panel non disponible',
              description: 'Impossible de charger les détails de ce panel'
            }
          };
        }) as PanelInvitation[];

        logger.debug('Invitations transformées:', transformedData);
        return transformedData;
      } catch (error) {
        console.error('Erreur chargement invitations:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les invitations',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !!user?.email
  });

  const handleAccept = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('panel_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({ 
        title: 'Invitation acceptée', 
        description: 'Vous avez rejoint le panel avec succès. Il apparaîtra maintenant dans votre planning.' 
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'acceptation',
        variant: 'destructive'
      });
    }
  });

  const handleDecline = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('panel_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({ 
        title: 'Invitation refusée', 
        description: 'Vous avez refusé l\'invitation' 
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du refus',
        variant: 'destructive'
      });
    }
  });

  const getStatusIcon = (status: InvitationStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted': return <Check className="h-4 w-4 text-green-500" />;
      case 'declined': return <X className="h-4 w-4 text-red-500" />;
      case 'expired': return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: InvitationStatus) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'declined': return 'Refusée';
      case 'expired': return 'Expirée';
    }
  };

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const pendingInvitations = invitations?.filter(inv => inv.status === 'pending' && !isExpired(inv.expires_at)) || [];
  const respondedInvitations = invitations?.filter(inv => inv.status !== 'pending' || isExpired(inv.expires_at)) || [];

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mes Invitations</h1>
          <p className="text-muted-foreground mt-1">
            Invitations aux panels que vous avez reçues
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-50">
            {pendingInvitations.length} en attente
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            {invitations?.filter(inv => inv.status === 'accepted').length || 0} acceptées
          </Badge>
        </div>
      </div>

      {/* Invitations en attente */}
      {pendingInvitations.length > 0 && (
        <Card className="w-full border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              Invitations en attente de réponse
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Ces invitations nécessitent votre réponse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map(invitation => (
                <Card key={invitation.id} className="border-l-4 border-l-yellow-500 bg-white">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {invitation.panel?.title || 'Panel sans titre'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {invitation.panel?.description || 'Aucune description disponible'}
                        </CardDescription>
                        
                        {/* Tags du panel */}
                        {invitation.panel?.tags && invitation.panel.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {invitation.panel.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        En attente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {invitation.panel?.date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(invitation.panel.date).toLocaleDateString('fr-FR')}
                            {invitation.panel.time && ` à ${invitation.panel.time}`}
                          </span>
                        </div>
                      )}
                      {invitation.panel?.moderator_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>Modéré par {invitation.panel.moderator_name}</span>
                        </div>
                      )}
                      {invitation.panel?.category && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{invitation.panel.category}</Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        <p>Invité le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}</p>
                        <p>Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}</p>
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInvitation(invitation)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Détails
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{invitation.panel?.title || 'Panel sans titre'}</DialogTitle>
                              <DialogDescription>
                                Détails complets de l'invitation au panel
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Description */}
                              <div>
                                <h4 className="font-medium mb-2">Description</h4>
                                <p className="text-sm text-muted-foreground">
                                  {invitation.panel?.description || 'Aucune description disponible'}
                                </p>
                              </div>

                              {/* Thème principal */}
                              {invitation.panel?.theme && (
                                <div>
                                  <h4 className="font-medium mb-2">Thème principal</h4>
                                  <Badge variant="outline" className="text-sm">
                                    {invitation.panel.theme}
                                  </Badge>
                                </div>
                              )}

                              {/* Informations pratiques */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-1">📅 Date et heure</h4>
                                  <p className="text-sm">
                                    {invitation.panel?.date && new Date(invitation.panel.date).toLocaleDateString('fr-FR')}
                                    {invitation.panel?.time && ` à ${invitation.panel.time}`}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">⏱️ Durée</h4>
                                  <p className="text-sm">{invitation.panel?.duration || 'Non spécifiée'} minutes</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">👤 Modérateur</h4>
                                  <p className="text-sm">{invitation.panel?.moderator_name || 'Non spécifié'}</p>
                                  {invitation.panel?.moderator_email && (
                                    <p className="text-xs text-muted-foreground">{invitation.panel.moderator_email}</p>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">👥 Participants max</h4>
                                  <p className="text-sm">{invitation.panel?.participants_limit || 'Non limité'}</p>
                                </div>
                              </div>

                              {/* Catégorie */}
                              {invitation.panel?.category && (
                                <div>
                                  <h4 className="font-medium mb-2">Catégorie</h4>
                                  <Badge variant="secondary">{invitation.panel.category}</Badge>
                                </div>
                              )}

                              {/* Tags */}
                              {invitation.panel?.tags && invitation.panel.tags.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Mots-clés</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {invitation.panel.tags.map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Informations sur l'invitation */}
                              <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">Informations sur l'invitation</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Invité le :</span>
                                    <p>{new Date(invitation.created_at).toLocaleDateString('fr-FR')}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Expire le :</span>
                                    <p>{new Date(invitation.expires_at).toLocaleDateString('fr-FR')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          size="sm"
                          onClick={() => handleAccept.mutate(invitation.id)}
                          disabled={handleAccept.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline.mutate(invitation.id)}
                          disabled={handleDecline.isPending}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des invitations */}
      {respondedInvitations.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Historique des invitations
            </CardTitle>
            <CardDescription>
              Invitations auxquelles vous avez déjà répondu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {respondedInvitations.map(invitation => {
                const expired = isExpired(invitation.expires_at);
                
                return (
                  <Card key={invitation.id} className="border-l-4 border-l-gray-300">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {invitation.panel?.title || 'Panel sans titre'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {invitation.panel?.description || 'Aucune description disponible'}
                          </CardDescription>
                          
                          {/* Thème et tags */}
                          <div className="flex gap-2 mt-2">
                            {invitation.panel?.theme && (
                              <Badge variant="outline" className="text-xs">
                                🎯 {invitation.panel.theme}
                              </Badge>
                            )}
                            {invitation.panel?.category && (
                              <Badge variant="secondary" className="text-xs">
                                {invitation.panel.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(expired ? 'expired' : invitation.status)}>
                          {getStatusIcon(expired ? 'expired' : invitation.status)}
                          <span className="ml-1">{getStatusText(expired ? 'expired' : invitation.status)}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {invitation.panel?.date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(invitation.panel.date).toLocaleDateString('fr-FR')}
                              {invitation.panel.time && ` à ${invitation.panel.time}`}
                            </span>
                          </div>
                        )}
                        {invitation.panel?.moderator_name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Modéré par {invitation.panel.moderator_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <p>Invité le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}</p>
                          {expired && (
                            <p className="text-red-600 font-medium">⚠️ Cette invitation a expiré</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {invitation.status === 'accepted' && (
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Vous participez à ce panel
                            </Badge>
                          )}

                          {invitation.status === 'declined' && (
                            <Badge className="bg-red-100 text-red-800">
                              ❌ Invitation refusée
                            </Badge>
                          )}

                          {invitation.status === 'accepted' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.location.href = '/schedule'}
                            >
                              Voir dans le planning
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message si aucune invitation */}
      {isLoading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des invitations...</p>
          </CardContent>
        </Card>
      ) : invitations?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Aucune invitation</h3>
            <p className="text-gray-600">
              Vous n'avez pas encore reçu d'invitations à des panels.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}