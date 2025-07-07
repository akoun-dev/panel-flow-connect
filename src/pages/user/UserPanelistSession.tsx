import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from "@tanstack/react-query";
import { useParams } from 'react-router-dom';
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useUser } from "@/hooks/useUser";
import SessionService from "@/services/SessionService";
import type { Session } from "@/types/session";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  FileAudio, 
  FileText,
  Clock,
  Calendar,
  User,
  Users,
  Download,
  Upload,
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  Save,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Headphones,
  Radio,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  Star,
  MoreHorizontal,
  Share2,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";


interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  audioBlob?: Blob;
  audioUrl?: string;
}

// Conversion WebM/PCM vers MP3 à l'aide de lamejs
const convertToMp3 = async (inputBlob: Blob): Promise<Blob> => {
  const { Mp3Encoder } = await import('lamejs');
  const arrayBuffer = await inputBlob.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const samples = audioBuffer.getChannelData(0);
  const mp3encoder = new Mp3Encoder(1, audioBuffer.sampleRate, 128);
  const sampleBlockSize = 1152;
  const mp3Data: Uint8Array[] = [];
  const converted = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    converted[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  for (let i = 0; i < converted.length; i += sampleBlockSize) {
    const chunk = converted.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }
  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) mp3Data.push(endBuf);
  ctx.close();
  return new Blob(mp3Data, { type: 'audio/mpeg' });
};

// Composant pour l'enregistrement audio
const AudioRecorder = ({ onRecordingComplete, onRecordingStart, onRecordingStop }: {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onRecordingStart: () => void;
  onRecordingStop: () => void;
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Obtenir les permissions et initialiser l'enregistrement
  const initializeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;

      // Configuration de l'analyseur audio pour la visualisation
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Configuration du MediaRecorder en privilégiant l'export MP3
      let mimeType = 'audio/mpeg';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        let blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        if (mediaRecorder.mimeType !== 'audio/mpeg') {
          blob = await convertToMp3(blob);
        }
        const audioUrl = URL.createObjectURL(blob);

        setRecordingState(prev => ({
          ...prev,
          audioBlob: blob,
          audioUrl: audioUrl
        }));

        onRecordingComplete(blob, recordingState.duration);
        chunks.length = 0;
      };

      mediaRecorderRef.current = mediaRecorder;
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'enregistrement:', error);
      return false;
    }
  };

  // Commencer l'enregistrement
  const startRecording = async () => {
    const initialized = await initializeRecording();
    if (!initialized || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.start(1000); // Chunk toutes les secondes
    startTimeRef.current = Date.now();
    
    setRecordingState(prev => ({
      ...prev,
      isRecording: true,
      isPaused: false,
      duration: 0
    }));

    // Timer pour la durée
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
      setRecordingState(prev => ({ ...prev, duration: elapsed }));
    }, 1000);

    // Monitoring du niveau audio
    monitorAudioLevel();
    onRecordingStart();
  };

  // Pauser l'enregistrement
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.pause();
      pausedTimeRef.current += Date.now() - startTimeRef.current;
      
      setRecordingState(prev => ({ ...prev, isPaused: true }));
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  // Reprendre l'enregistrement
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      
      setRecordingState(prev => ({ ...prev, isPaused: false }));
      
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setRecordingState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        audioLevel: 0
      }));

      pausedTimeRef.current = 0;
      onRecordingStop();
    }
  };

  // Monitoring du niveau audio
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !recordingState.isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      
      setRecordingState(prev => ({ ...prev, audioLevel: normalizedLevel }));
      
      if (recordingState.isRecording && !recordingState.isPaused) {
        requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  };

  // Formater la durée
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Status indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              recordingState.isRecording 
                ? recordingState.isPaused 
                  ? 'bg-yellow-500 animate-pulse' 
                  : 'bg-red-500 animate-pulse'
                : 'bg-gray-300'
            }`} />
            <span className="text-sm font-medium">
              {recordingState.isRecording 
                ? recordingState.isPaused ? 'En pause' : 'Enregistrement en cours'
                : 'Prêt à enregistrer'
              }
            </span>
            {recordingState.isRecording && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                <Radio className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            )}
          </div>
          
          <div className="text-2xl font-mono font-bold text-gray-700">
            {formatDuration(recordingState.duration)}
          </div>
        </div>

        {/* Visualiseur audio */}
        <div className="mb-6">
          <div className="h-16 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
            {recordingState.isRecording && !recordingState.isPaused ? (
              <div className="flex items-center space-x-1 h-full">
                {Array.from({ length: 50 }, (_, i) => (
                  <div
                    key={i}
                    className="bg-blue-500 rounded-full transition-all duration-75"
                    style={{
                      width: '3px',
                      height: `${Math.max(4, recordingState.audioLevel * 60 + Math.random() * 10)}px`,
                      opacity: 0.7 + recordingState.audioLevel * 0.3
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center text-gray-400">
                <Volume2 className="h-8 w-8 mr-2" />
                <span>Visualiseur audio</span>
              </div>
            )}
          </div>
          
          {/* Niveau audio */}
          <div className="mt-2 flex items-center gap-2">
            <VolumeX className="h-4 w-4 text-gray-400" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${recordingState.audioLevel * 100}%` }}
              />
            </div>
            <Volume2 className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Contrôles d'enregistrement */}
        <div className="flex items-center justify-center gap-4">
          {!recordingState.isRecording ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full h-16 w-16"
                  >
                    <Mic className="h-8 w-8" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Commencer l'enregistrement</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={recordingState.isPaused ? resumeRecording : pauseRecording}
                      size="lg"
                      variant="outline"
                      className="rounded-full h-12 w-12"
                    >
                      {recordingState.isPaused ? (
                        <Play className="h-6 w-6" />
                      ) : (
                        <Pause className="h-6 w-6" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {recordingState.isPaused ? 'Reprendre' : 'Pauser'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      className="bg-gray-600 hover:bg-gray-700 text-white rounded-full h-16 w-16"
                    >
                      <Square className="h-8 w-8" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Arrêter l'enregistrement</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>

        {/* Aperçu audio */}
        {recordingState.audioUrl && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Enregistrement terminé</span>
              </div>
              <Badge variant="outline" className="text-green-700">
                {formatDuration(recordingState.duration)}
              </Badge>
            </div>
            
            <audio 
              controls 
              src={recordingState.audioUrl}
              className="w-full"
              preload="metadata"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Composant pour la transcription
const TranscriptionPanel = ({ audioBlob, onTranscriptionComplete }: {
  audioBlob?: Blob;
  onTranscriptionComplete: (transcript: string, confidence: number) => void;
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [editMode, setEditMode] = useState(false);

  // Simulation de transcription (dans un vrai projet, vous utiliseriez une API comme OpenAI Whisper)
  const simulateTranscription = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscript('');
    setConfidence(0);

    // Simulation du processus de transcription
    const words = [
      "Bonjour", "et", "merci", "de", "me", "donner", "la", "parole.",
      "Je", "souhaite", "aborder", "aujourd'hui", "la", "question", "importante",
      "de", "la", "digitalisation", "de", "nos", "processus.", "Il", "est", "essentiel",
      "que", "nous", "prenions", "en", "compte", "les", "besoins", "de", "tous",
      "les", "utilisateurs", "dans", "cette", "démarche", "de", "transformation."
    ];

    let currentTranscript = '';
    let wordIndex = 0;

    const addWord = () => {
      if (wordIndex < words.length) {
        currentTranscript += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        setTranscript(currentTranscript);
        setConfidence(Math.min(95, 70 + wordIndex * 2)); // Simulation de confiance croissante
        wordIndex++;
        setTimeout(addWord, 200 + Math.random() * 300);
      } else {
        setIsTranscribing(false);
        onTranscriptionComplete(currentTranscript, 92);
      }
    };

    // Délai initial
    setTimeout(addWord, 1000);
  };

  const saveTranscription = () => {
    onTranscriptionComplete(transcript, confidence);
    setEditMode(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcription
          </CardTitle>
          
          {audioBlob && !isTranscribing && !transcript && (
            <Button onClick={simulateTranscription} variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Transcrire
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!audioBlob ? (
          <div className="text-center py-8">
            <FileAudio className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Enregistrez d'abord un audio pour obtenir la transcription</p>
          </div>
        ) : isTranscribing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600">Transcription en cours...</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {confidence}% confiance
              </Badge>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
              <p className="text-gray-800 leading-relaxed">
                {transcript}
                <span className="animate-pulse">|</span>
              </p>
            </div>
          </div>
        ) : transcript ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Transcription terminée</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {confidence}% confiance
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setEditMode(!editMode)}
                  variant="outline"
                  size="sm"
                >
                  {editMode ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
                
                {editMode && (
                  <Button onClick={saveTranscription} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>

            {editMode ? (
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-[120px] text-gray-800"
                placeholder="Modifiez la transcription..."
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Button onClick={simulateTranscription} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="h-4 w-4 mr-2" />
              Démarrer la transcription
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Composant principal
export default function PanelistSessions() {
  const { panelId } = useParams<{ panelId: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  
  // États pour la session en cours
  const [currentSession, setCurrentSession] = useState<Partial<Session>>({
    title: '',
    description: '',
    status: 'draft',
    is_public: false,
    recording_quality: 'high',
    tags: []
  });
  
  const [recordedAudio, setRecordedAudio] = useState<{
    blob?: Blob;
    url?: string;
    duration?: number;
  }>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'duration'>('recent');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);

  const { data: sessions = [], isLoading, isError, refetch } = useQuery<Session[]>({
    queryKey: ['panelist-sessions', panelId, user?.email],
    queryFn: () => SessionService.getByPanelAndUser(panelId as string, user?.email || ''),
    enabled: !!panelId && !!user?.email,
    refetchOnWindowFocus: false
  });

  const panelistSession = sessions[0];

  // Gérer la fin d'enregistrement
  const handleRecordingComplete = (blob: Blob, duration: number) => {
    const audioUrl = URL.createObjectURL(blob);
    setRecordedAudio({ blob, url: audioUrl, duration });
    
    setCurrentSession(prev => ({
      ...prev,
      duration,
      status: 'completed'
    }));
  };

  // Gérer la transcription
  const handleTranscriptionComplete = (transcript: string, confidence: number) => {
    setCurrentSession(prev => ({
      ...prev,
      transcript,
      transcript_confidence: confidence
    }));
  };

  // Sauvegarder la session
  const saveSession = async () => {
    if (!currentSession.title || !recordedAudio.blob || !panelId || !user) return;

    try {
      const fileName = `${crypto.randomUUID()}.mp3`;
      const { error: uploadErr } = await supabase.storage
        .from('recordings')
        .upload(fileName, recordedAudio.blob, { contentType: 'audio/mpeg' });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      await SessionService.insert({
        ...(currentSession as Omit<Session, 'id' | 'created_at' | 'updated_at'>),
        panel_id: panelId,
        panelist_id: user.id,
        panelist_name: user.user_metadata?.name ?? '',
        panelist_email: user.email ?? '',
        duration: recordedAudio.duration ?? 0,
        audio_url: urlData.publicUrl
      });

      toast({
        title: 'Session sauvegardée',
        description: 'Votre session a été enregistrée avec succès'
      });

      // Reset
      setCurrentSession({
        title: '',
        description: '',
        status: 'draft',
        is_public: false,
        recording_quality: 'high',
        tags: []
      });
      setRecordedAudio({});
      setShowNewSessionDialog(false);
      refetch();

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error.message, error);
      toast({
        title: 'Erreur',
        description: `Impossible de sauvegarder la session${error?.message ? `: ${error.message}` : ''}`,
        variant: 'destructive'
      });
    }
  };

  // Filtrage et tri
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.transcript?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'duration':
        return b.duration - a.duration;
      default:
        return 0;
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'recording': return 'bg-red-100 text-red-800';
      case 'transcribing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'recording': return <Radio className="h-4 w-4" />;
      case 'transcribing': return <Activity className="h-4 w-4" />;
      default: return <FileAudio className="h-4 w-4" />;
    }
  };

  if (!panelId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-yellow-200">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-yellow-700 mb-2">Panel requis</h3>
            <p className="text-yellow-600">Veuillez sélectionner un panel pour accéder aux sessions</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sessions Paneliste</h1>
          <p className="text-gray-600">Enregistrez et transcrivez vos prises de parole</p>
        </div>

        <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nouvelle Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle session</DialogTitle>
              <DialogDescription>
                Enregistrez votre prise de parole et obtenez une transcription automatique
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Informations de session */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Titre de la session *</label>
                    <Input
                      value={currentSession.title}
                      onChange={(e) => setCurrentSession(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Discussion sur la stratégie 2024"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={currentSession.description}
                      onChange={(e) => setCurrentSession(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Décrivez brièvement le contenu de cette session..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Qualité d'enregistrement</label>
                    <Select
                      value={currentSession.recording_quality}
                      onValueChange={(value: 'high' | 'medium' | 'low') => 
                        setCurrentSession(prev => ({ ...prev, recording_quality: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Haute qualité (recommandé)</SelectItem>
                        <SelectItem value="medium">Qualité moyenne</SelectItem>
                        <SelectItem value="low">Qualité faible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={currentSession.is_public}
                      onChange={(e) => setCurrentSession(prev => ({ ...prev, is_public: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="public" className="text-sm">
                      Rendre cette session publique
                    </label>
                  </div>
                </div>
              </div>

              {/* Enregistrement audio */}
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onRecordingStart={() => setCurrentSession(prev => ({ ...prev, status: 'recording' }))}
                onRecordingStop={() => setCurrentSession(prev => ({ ...prev, status: 'completed' }))}
              />

              {/* Transcription */}
              {recordedAudio.blob && (
                <TranscriptionPanel
                  audioBlob={recordedAudio.blob}
                  onTranscriptionComplete={handleTranscriptionComplete}
                />
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewSessionDialog(false);
                    setCurrentSession({
                      title: '',
                      description: '',
                      status: 'draft',
                      is_public: false,
                      recording_quality: 'high',
                      tags: []
                    });
                    setRecordedAudio({});
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveSession}
                  disabled={!currentSession.title || !recordedAudio.blob}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {panelistSession && (
        <Card>
          <CardContent className="text-center p-4">
            <h2 className="text-xl font-semibold mb-1">{panelistSession.title}</h2>
            <p className="text-gray-600">Durée prévue : {formatDuration(panelistSession.duration)}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
              </div>
              <FileAudio className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Temps Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(sessions.reduce((acc, s) => acc + s.duration, 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transcrites</p>
                <p className="text-2xl font-bold text-purple-600">
                  {sessions.filter(s => s.transcript).length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confiance Moy.</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(sessions.reduce((acc, s) => acc + (s.transcript_confidence || 0), 0) / sessions.length) || 0}%
                </p>
              </div>
              <Star className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contrôles de filtrage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher dans les sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="recording">Enregistrement</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="transcribing">Transcription</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: 'recent' | 'oldest' | 'duration') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Plus récent</SelectItem>
                  <SelectItem value="oldest">Plus ancien</SelectItem>
                  <SelectItem value="duration">Durée</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des sessions */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="justify-center">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>Impossible de charger les sessions.</AlertDescription>
          </Alert>
        ) : sortedSessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileAudio className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'Aucun résultat' : 'Aucune session'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all'
                  ? 'Aucune session ne correspond à vos critères'
                  : 'Créez votre première session pour commencer'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {sortedSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Informations principales */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {session.title}
                            </h3>
                            {session.description && (
                              <p className="text-gray-600 mb-3">{session.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(session.status)}>
                              {getStatusIcon(session.status)}
                              <span className="ml-1 capitalize">{session.status}</span>
                            </Badge>
                            
                            {session.is_public && (
                              <Badge variant="outline">
                                <Users className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(session.created_at).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(session.duration)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {session.panelist_name}
                          </div>
                          {session.transcript_confidence && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4" />
                              {session.transcript_confidence}% confiance
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {session.tags && session.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {session.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Transcription preview */}
                        {session.transcript && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Transcription</span>
                              <Badge variant="outline" className="text-xs">
                                {session.transcript_confidence}% confiance
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {session.transcript}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Voir les détails</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Télécharger</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Partager</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Upload className="h-4 w-4 mr-2" />
                              Exporter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}