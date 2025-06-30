import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LayoutDashboard, PanelLeft, Calendar, MessageSquare, FileText, Settings, ChevronRight, Star, Users, BarChart2, ArrowRight, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: PanelLeft,
    title: "Gestion des Panels",
    description: "Créez et gérez vos panels d'étude avec segmentation avancée des participants et suivi en temps réel",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: MessageSquare,
    title: "Questionnaires Dynamiques",
    description: "Concevez des questionnaires adaptatifs avec logique conditionnelle et analyse des réponses",
    gradient: "from-blue-500 to-cyan-500"
  },
  // {
  //   icon: Users,
  //   title: "Participants",
  //   description: "Gérez vos participants, suivez leur engagement et segmenter vos audiences",
  //   gradient: "from-green-500 to-emerald-500"
  // },
  
  {
    icon: Calendar,
    title: "Planning Intelligent",
    description: "Planifiez et optimisez vos sessions d'étude selon les disponibilités",
    gradient: "from-indigo-500 to-purple-500"
  },
  // {
  //   icon: FileText,
  //   title: "Rapports Complets",
  //   description: "Exportez vos résultats sous différents formats avec visualisations personnalisables",
  //   gradient: "from-gray-500 to-slate-500"
  // }
];

const stats = [
  { icon: Users, value: "10K+", label: "Utilisateurs actifs", increase: "+23%" },
  { icon: BarChart2, value: "95%", label: "Taux de satisfaction", increase: "+5%" },
  { icon: Star, value: "4.9/5", label: "Note moyenne", increase: "+0.2" },
  { icon: PanelLeft, value: "500+", label: "Panels actifs", increase: "+45%" }
];

const testimonials = [
  {
    content: "Panel Flow Connect a révolutionné notre façon de mener des études de marché. La plateforme est intuitive et les insights générés par l'IA nous font gagner un temps précieux.",
    author: "Marie Dubois",
    role: "Responsable Études - TechCorp",
    avatar: "MD"
  },
  {
    content: "Gain de temps considérable dans la gestion de nos panels. Les rapports automatiques et la planification intelligente ont transformé notre productivité.",
    author: "Jean Moreau",
    role: "Directeur Marketing - InnovateLab",
    avatar: "JM"
  },
  {
    content: "Solution complète et fiable. L'équipe support est réactive et la plateforme évolue constamment avec de nouvelles fonctionnalités.",
    author: "Sophie Laurent",
    role: "Chef de projet - MarketResearch Pro",
    avatar: "SL"
  }
];

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();

  const handleNavigation = (path) => {
    console.log(`Navigating to: ${path}`);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Enhanced background with animated gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle,
                ${i % 2 === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'},
                transparent 70%)`,
              animation: `float ${Math.random() * 20 + 10}s infinite ease-in-out ${Math.random() * 5}s`,
              transform: `scale(${Math.random() + 0.5})`
            }}
          />
        ))}
        
        {/* Keyframes for floating animation */}
        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translate(0, 0) scale(1); }
              25% { transform: translate(5%, 5%) scale(1.05); }
              50% { transform: translate(10%, 0) scale(1); }
              75% { transform: translate(5%, -5%) scale(0.95); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}
        </style>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Modern Hero Section */}
        <div className="text-center mb-20">
          <div className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 animate-[pulse_3s_ease-in-out_infinite] hover:animate-none hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
              Nouveau : Statistiques temps réel améliorées
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent mb-6 leading-tight">
              <span className="inline-block animate-[fadeIn_1s_ease-in-out]">Optimisez vos</span>
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-[slideIn_1s_ease-in-out_0.5s_forwards] opacity-0">
                sessions interactives
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto mb-10 leading-relaxed animate-[fadeIn_1s_ease-in-out_0.8s_forwards] opacity-0">
              La solution complète pour gérer vos panels et interactions.<br className="hidden sm:inline" />
              Collectez et analysez les réponses en temps réel avec précision.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-[fadeInUp_1s_ease-in-out_1s_forwards] opacity-0">

              <Button
                variant="outline"
                size="lg"
                className="px-8 py-6 text-lg border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transform hover:scale-105 transition-all duration-200"
                onClick={() => handleNavigation("/auth/login")}
              >
                Se connecter
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats with staggered animation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-center border border-white/20 hover:border-blue-200 hover:-translate-y-2 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-center mb-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white group-hover:scale-110 transition-transform duration-200">
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-slate-600 text-sm mb-2">{stat.label}</p>
              <div className="flex items-center justify-center gap-1 text-green-600 text-xs font-medium">
                <TrendingUp className="h-3 w-3" />
                {stat.increase}
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Features */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Fonctionnalités de
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> nouvelle génération</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Découvrez une suite d'outils alimentés par l'IA pour transformer vos études de marché
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/20 hover:border-transparent overflow-hidden transform hover:-translate-y-3 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 150}ms` }}
                onMouseEnter={() => setActiveFeature(index)}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <CardHeader className="relative">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-slate-800 mb-2">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-slate-600 leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
            ))}
          </div>
        </div>

        {/* How it works with enhanced visuals */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Comment ça marche ?</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Trois étapes simples pour révolutionner vos études de marché
            </p>
          </div>
          
          <div className="relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 transform -translate-y-1/2"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Créez votre panel",
                  description: "Définissez vos critères avec l'aide de notre IA et invitez automatiquement les participants les plus pertinents",
                  icon: Users,
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  step: "02", 
                  title: "Lancez les sessions",
                  description: "Planification intelligente et animation automatisée de vos sessions avec des questionnaires adaptatifs",
                  icon: Zap,
                  gradient: "from-purple-500 to-pink-500"
                },
                {
                  step: "03",
                  title: "Analysez avec l'IA",
                  description: "Recevez des insights précis, des tendances automatiques et des recommandations stratégiques",
                  icon: TrendingUp,
                  gradient: "from-green-500 to-emerald-500"
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className={`relative bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 text-center border border-white/20 hover:border-blue-200 group transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${(index + 1) * 200}ms` }}
                >
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${item.gradient} text-white text-sm font-bold flex items-center justify-center shadow-lg`}>
                      {item.step}
                    </div>
                  </div>
                  
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  
                  <h3 className="font-bold text-xl text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Testimonials */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Ils nous font confiance</h2>
            <p className="text-xl text-slate-600">Plus de 10 000 professionnels utilisent Panel Flow Connect</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 border border-white/20 hover:border-blue-200 group transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <blockquote className="text-slate-700 italic mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.author}</p>
                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced CTA */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-3xl p-12 text-center text-white overflow-hidden shadow-2xl">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-blue-600/50 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Essai gratuit de 14 jours - Sans engagement
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à transformer vos études ?
            </h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90 leading-relaxed">
              Rejoignez plus de 10 000 professionnels qui révolutionnent leurs études de marché avec Panel Flow Connect
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="px-12 py-6 text-lg bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                onClick={() => handleNavigation("/auth/register")}
              >
                Démarrer maintenant
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-6 text-lg border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                onClick={() => handleNavigation("/contact")}
              >
                Parler à un expert
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}