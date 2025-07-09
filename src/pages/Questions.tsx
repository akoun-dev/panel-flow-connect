import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { LucideIcon } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useRealtimeQuestions } from '@/hooks/useRealtimeQuestions';
import { Panel, Panelist } from '../types';
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Clock, 
  User, 
  UserX, 
  Send, 
  Filter,
  Search,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Reply,
  Flag,
  Activity,
  Sparkles,
  ArrowDown,
  RefreshCw,
  Plus,
  Zap,
  TrendingUp,
  Users,
  Hash
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Question {
  id: string;
  content: string;
  panel_id: string;
  panelist_email?: string | null;
  panelist_name?: string | null;
  author_name?: string | null;
  author_structure?: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  created_at: string;
}

export default function Questions({ panel }: { panel?: Panel }) {
  const { user } = useUser();
  const {
    questions,
    status,
    loading: isLoading,
    newQuestionIds,
    refresh
  } = useRealtimeQuestions(panel?.id);
  const isConnected = status === 'SUBSCRIBED';
  const newQuestionCount = newQuestionIds.size;
  const [newQuestion, setNewQuestion] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorStructure, setAuthorStructure] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [selectedPanelistEmail, setSelectedPanelistEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'answered' | 'unanswered'>('recent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  const questionsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      panel?.panelists &&
      (panel.panelists as Panelist[]).length > 0 &&
      !selectedPanelistEmail
    ) {
      setSelectedPanelistEmail((panel.panelists as Panelist[])[0].email);
    }
  }, [panel, selectedPanelistEmail]);

  const scrollToBottom = () => {
    questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('Submit triggered', { newQuestion, panel });
    
    if (!newQuestion.trim()) {
      logger.debug('Validation failed: empty question');
      toast.error('Veuillez saisir une question');
      return;
    }

    if (newQuestion.length > 500) {
      logger.debug('Validation failed: question too long');
      toast.error('La question ne doit pas dépasser 500 caractères');
      return;
    }

    if (
      !isAnonymous &&
      (!authorName.trim() || !authorStructure.trim())
    ) {
      toast.error('Veuillez renseigner votre nom et votre structure');
      return;
    }

    if (!panel?.id) {
      console.error('Panel ID missing:', panel);
      toast.error('Erreur: Panel non défini');
      return;
    }

    setIsSubmitting(true);
    try {
      logger.debug('Submitting question to Supabase:', {
        content: newQuestion.trim(),
        panel_id: panel.id,
        is_anonymous: true,
        length: newQuestion.length
      });

      const panelistName =
        panel?.panelists &&
        (panel.panelists as Panelist[]).find(p => p.email === selectedPanelistEmail)?.name || null;

      const { data, error } = await supabase
        .from('questions')
        .insert({
          content: newQuestion.trim(),
          panel_id: panel.id,
          is_anonymous: isAnonymous,
          is_answered: false,
          panelist_email: selectedPanelistEmail || null,
          panelist_name: panelistName,
          author_name: isAnonymous ? null : authorName.trim(),
          author_structure: isAnonymous ? null : authorStructure.trim()
        })
        .select()
        .single();

      logger.debug('Supabase response:', { data, error, status: error?.code });

      if (error) {
        console.error('Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      logger.debug('Question submitted successfully:', data);
      setNewQuestion('');
      setAuthorName('');
      setAuthorStructure('');
      toast.success('Question envoyée avec succès! 🚀');
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error(`Erreur lors de l'envoi de la question: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsAnswered = async (questionId: string, isAnswered: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_answered: !isAnswered })
        .eq('id', questionId);

      if (error) throw error;
      toast.success(isAnswered ? 'Question marquée comme non répondue' : 'Question marquée comme répondue');
    } catch (error) {
      console.error('Error updating question status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return;
    
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast.success('Question supprimée');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredQuestions = questions
    .filter(question => {
      const matchesSearch = question.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filterStatus === 'all' || 
        (filterStatus === 'answered' && question.is_answered) ||
        (filterStatus === 'unanswered' && !question.is_answered);
      return matchesSearch && matchesFilter;
    });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    switch (activeTab) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'answered':
        if (a.is_answered && !b.is_answered) return -1;
        if (!a.is_answered && b.is_answered) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'unanswered':
        if (!a.is_answered && b.is_answered) return -1;
        if (a.is_answered && !b.is_answered) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const getQuestionStats = () => {
    const total = questions.length;
    const answered = questions.filter(q => q.is_answered).length;
    const unanswered = total - answered;
    const recent = questions.filter(q => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return new Date(q.created_at) > hourAgo;
    }).length;
    
    return { total, answered, unanswered, recent };
  };

  const stats = getQuestionStats();

  const StatCard = ({ 
    icon: Icon, 
    value, 
    label, 
    color, 
    gradient 
  }: { 
    icon: any; 
    value: number; 
    label: string; 
    color: string;
    gradient: string;
  }) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
         style={{ background: gradient }}>
      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" 
           style={{ background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.2), transparent)' }}></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-8 w-8 opacity-90" />
          <div className="text-3xl font-bold animate-pulse">{value}</div>
        </div>
        <div className="text-sm opacity-90 font-medium">{label}</div>
      </div>
    </div>
  );

  const TabButton = ({ 
    id, 
    label, 
    icon: Icon, 
    count,
    isActive
  }: { 
    id: string; 
    label: string; 
    icon: any; 
    count: number;
    isActive: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 group ${
        isActive 
          ? 'text-white shadow-lg transform -translate-y-0.5' 
          : 'text-gray-600 hover:text-white hover:transform hover:-translate-y-0.5'
      }`}
      style={{
        background: isActive 
          ? 'linear-gradient(135deg, #0c54a4, #046eb6)'
          : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          isActive ? 'bg-white/20' : 'bg-blue-100 text-blue-800'
        }`}>
          {count}
        </span>
      )}
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
      )}
    </button>
  );

  const QuestionCard = ({ question, index }: { question: Question; index: number }) => {
    const isRecent = new Date(Date.now() - 10 * 60 * 1000) < new Date(question.created_at);
    const panelistName = question.panelist_name ||
      panel?.panelists && (panel.panelists as Panelist[]).find(p => p.email === question.panelist_email)?.name;

    return (
      <div
        className={`group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden ${
          isRecent ? 'ring-2 ring-blue-400/50' : ''
        }`}
        style={{ 
          animationDelay: `${index * 100}ms`,
          background: isRecent 
            ? 'linear-gradient(135deg, rgba(25,179,210,0.05), rgba(69,185,188,0.05))'
            : 'white'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-teal-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div 
          className={`absolute left-0 top-0 w-1 h-full transition-all duration-300 ${
            question.is_answered ? 'bg-green-500' : 'bg-blue-400'
          } group-hover:w-2`}
          style={{
            background: question.is_answered 
              ? 'linear-gradient(to bottom, #84c282, #5cbcb4)'
              : 'linear-gradient(to bottom, #19b3d2, #45b9bc)'
          }}
        ></div>

        <div className="relative z-10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {question.is_answered && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: 'linear-gradient(135deg, #84c282, #5cbcb4)' }}>
                  <CheckCircle2 className="h-3 w-3" />
                  Répondue
                </span>
              )}
              
              {isRecent && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white animate-pulse"
                      style={{ background: 'linear-gradient(135deg, #19b3d2, #45b9bc)' }}>
                  <Sparkles className="h-3 w-3" />
                  Nouvelle
                </span>
              )}
              
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                question.is_anonymous 
                  ? 'bg-gray-100 text-gray-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {question.is_anonymous ? <UserX className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {question.is_anonymous ? 'Anonyme' : 'Identifié'}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-800 leading-relaxed text-base">{question.content}</p>
          </div>

          {panelistName && (
            <p className="text-sm text-gray-500 mb-4">Pour {panelistName}</p>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Connexion en temps réel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header avec titre et indicateur de connexion */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-600">
              {isConnected ? 'Temps réel actif' : 'Connexion interrompue'}
            </span>
            {newQuestionIds.size > 0 && (
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold animate-bounce">
                +{newQuestionIds.size} nouvelle(s)
              </span>
            )}
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-4">
            <div className="p-3 rounded-2xl text-white"
                 style={{ background: 'linear-gradient(135deg, #0c54a4, #046eb6)' }}>
              <MessageSquare className="h-8 w-8" />
            </div>
            Questions Live
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #19b3d2, #45b9bc)' }}>
              <Zap className="h-4 w-4" />
              Live
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {panel?.title || 'Panel non défini'}
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Hash}
            value={stats.total}
            label="Total des questions"
            color="#0c54a4"
            gradient="linear-gradient(135deg, #0c54a4, #046eb6)"
          />
          <StatCard
            icon={CheckCircle2}
            value={stats.answered}
            label="Questions répondues"
            color="#84c282"
            gradient="linear-gradient(135deg, #84c282, #5cbcb4)"
          />
          <StatCard
            icon={Clock}
            value={stats.unanswered}
            label="En attente"
            color="#45b9bc"
            gradient="linear-gradient(135deg, #45b9bc, #19b3d2)"
          />
          <StatCard
            icon={TrendingUp}
            value={stats.recent}
            label="Récentes (1h)"
            color="#19b3d2"
            gradient="linear-gradient(135deg, #19b3d2, #5cbcb4)"
          />
        </div>

        {/* Formulaire de nouvelle question */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-teal-400/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Poser une question</h2>
                <p className="text-gray-600">Votre question apparaîtra instantanément à tous les participants</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-semibold text-gray-700 mb-2">
                      Votre question
                    </Label>
                    <Textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Posez votre question ici..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 resize-none transition-all duration-200"
                      rows={4}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {newQuestion.length}/500 caractères
                    </div>
                  </div>

                  {panel?.panelists && (panel.panelists as Panelist[]).length > 0 && (
                    <div>
                      <Label className="block text-sm font-semibold text-gray-700 mb-2">
                        Panéliste destinataire
                      </Label>
                      <Select
                        value={selectedPanelistEmail}
                        onValueChange={setSelectedPanelistEmail}
                      >
                        <SelectTrigger className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 transition-all duration-200">
                          <SelectValue placeholder="Choisir un paneliste" />
                        </SelectTrigger>
                        <SelectContent>
                          {(panel.panelists as Panelist[]).map((p: Panelist) => (
                            <SelectItem key={p.email} value={p.email}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={setIsAnonymous}
                    />
                    <Label htmlFor="anonymous" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      {isAnonymous ? <UserX className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      Poser anonymement
                    </Label>
                  </div>
                  {!isAnonymous && (
                    <>
                      <div>
                        <Label className="block text-sm font-semibold text-gray-700 mb-2">
                          Votre nom
                        </Label>
                        <Input
                          type="text"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-semibold text-gray-700 mb-2">
                          Votre structure
                        </Label>
                        <Input
                          type="text"
                          value={authorStructure}
                          onChange={(e) => setAuthorStructure(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !newQuestion.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:scale-100"
                    style={{ background: 'linear-gradient(135deg, #0c54a4, #046eb6)' }}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="animate-spin h-5 w-5" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer la question'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}