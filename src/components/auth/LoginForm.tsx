import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Zap,
  Users,
  Github,
  Chrome,
  Sparkles
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  // Validation en temps réel
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "L'email est requis";
    if (!emailRegex.test(email)) return "Format d'email invalide";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Le mot de passe est requis";
    if (password.length < 6) return "Au moins 6 caractères requis";
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    const error = validateEmail(value);
    setValidationErrors(prev => ({ ...prev, email: error }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    const error = validatePassword(value);
    setValidationErrors(prev => ({ ...prev, password: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation finale
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError || passwordError) {
      setValidationErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Animation de succès
      setShowSuccess(true);
      
      // Récupère le rôle de l'utilisateur
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user?.id)
        .single();

      setTimeout(() => {
        if (userData?.role === 'user') {
          navigate('/dashboard');
        } else if (userData?.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
          toast.error("Vous n'avez pas les droits d'accès");
        }
      }, 1500);

      toast.success("Connexion réussie ! Redirection...");
    } catch (error) {
      toast.error(error.message || "Erreur de connexion");
      setShowSuccess(false);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });
      if (error) throw error;
    } catch (error) {
      toast.error(`Erreur de connexion ${provider}`);
    }
  };

  const isFormValid = !validationErrors.email && !validationErrors.password && email && password;

  return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.15)] via-[hsl(var(--accent)/0.15)] to-[hsl(var(--secondary)/0.15)] relative overflow-hidden">
          {/* Éléments décoratifs d'arrière-plan */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-4 -left-4 w-32 sm:w-48 md:w-72 h-32 sm:h-48 md:h-72 bg-[hsl(var(--primary)/0.3)] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
              <div className="absolute top-1/2 -right-4 w-32 sm:w-48 md:w-72 h-32 sm:h-48 md:h-72 bg-[hsl(var(--accent)/0.3)] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
              <div className="absolute -bottom-8 left-1/2 w-32 sm:w-48 md:w-72 h-32 sm:h-48 md:h-72 bg-[hsl(var(--secondary)/0.3)] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-500"></div>
          </div>

          <div className="relative z-10 min-h-screen flex flex-col">
              <div className="flex-1 grid lg:grid-cols-2">
                  {/* Section gauche - Présentation (cachée sur mobile) */}
                  <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6 }}
                      className="hidden lg:flex lg:flex-col lg:justify-center lg:items-start lg:h-full space-y-6 xl:space-y-8 px-8 xl:px-16 2xl:px-24"
                  >
                      <div className="text-left">
                          <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="inline-flex items-center gap-2 bg-[hsl(var(--primary)/0.1)] text-primary px-3 py-1.5 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-medium mb-4 xl:mb-6"
                          >
                              <Sparkles className="h-3 w-3 xl:h-4 xl:w-4" />
                              Plateforme PanelFlow
                          </motion.div>

                          <motion.h1
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 mb-3 xl:mb-4"
                          >
                              Bienvenue sur
                              <span className="text-gradient block">PanelFlow</span>
                          </motion.h1>

                          <motion.p
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="text-base xl:text-lg 2xl:text-xl text-gray-600 mb-6 xl:mb-8"
                          >
                              La solution complète pour gérer vos panels et
                              interactions en temps réel
                          </motion.p>
                      </div>

                      <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="grid gap-4 xl:gap-6"
                      >
                          <div className="flex items-center gap-3 xl:gap-4">
                              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Zap className="h-5 w-5 xl:h-6 xl:w-6 text-white" />
                              </div>
                              <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm xl:text-base">
                                      Temps réel
                                  </h3>
                                  <p className="text-gray-600 text-xs xl:text-sm">
                                      Interactions instantanées avec vos
                                      participants
                                  </p>
                              </div>
                          </div>

                          <div className="flex items-center gap-3 xl:gap-4">
                              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Users className="h-5 w-5 xl:h-6 xl:w-6 text-white" />
                              </div>
                              <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm xl:text-base">
                                      Gestion d'équipe
                                  </h3>
                                  <p className="text-gray-600 text-xs xl:text-sm">
                                      Collaborez efficacement avec votre équipe
                                  </p>
                              </div>
                          </div>

                          <div className="flex items-center gap-3 xl:gap-4">
                              <div className="w-10 h-10 xl:w-12 xl:h-12 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Shield className="h-5 w-5 xl:h-6 xl:w-6 text-white" />
                              </div>
                              <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm xl:text-base">
                                      Sécurisé
                                  </h3>
                                  <p className="text-gray-600 text-xs xl:text-sm">
                                      Vos données protégées par des standards
                                      enterprise
                                  </p>
                              </div>
                          </div>
                      </motion.div>
                  </motion.div>
                  {/* Formulaire de connexion */}
                  <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 w-full"
                  >
                      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl xl:max-w-2xl">
                          <Card className="backdrop-blur-sm bg-white/90 sm:bg-white/80 border-0 shadow-xl sm:shadow-2xl">
                              <CardHeader className="space-y-1 text-center pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 pt-4 sm:pt-6">
                                  <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.4 }}
                                      className="mx-auto w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-primary to-accent rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                                  >
                                      <Lock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
                                  </motion.div>

                                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                                      Connexion
                                  </CardTitle>
                                  <CardDescription className="text-sm sm:text-base text-gray-600 px-2">
                                      Accédez à votre espace PanelFlow
                                  </CardDescription>
                              </CardHeader>

                              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
                                  <motion.form
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.6 }}
                                      onSubmit={handleSubmit}
                                      className="space-y-3 sm:space-y-4"
                                  >
                                      {/* Email */}
                                      <div className="space-y-1 sm:space-y-2">
                                          <Label
                                              htmlFor="email"
                                              className="text-xs sm:text-sm font-medium"
                                          >
                                              Adresse email
                                          </Label>
                                          <div className="relative">
                                              <Mail className="absolute left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                              <Input
                                                  id="email"
                                                  type="email"
                                                  placeholder="votre@email.com"
                                                  value={email}
                                                  onChange={handleEmailChange}
                                                  className={`pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 lg:h-11 text-sm transition-all ${
                                                      validationErrors.email
                                                          ? "border-[hsl(var(--destructive)/0.3)] focus:border-destructive"
                                                          : email &&
                                                            !validationErrors.email
                                                          ? "border-[hsl(var(--secondary)/0.3)] focus:border-secondary"
                                                          : ""
                                                  }`}
                                                  required
                                              />
                                              {email &&
                                                  !validationErrors.email && (
                                                      <CheckCircle className="absolute right-2.5 sm:right-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-secondary" />
                                                  )}
                                              {validationErrors.email && (
                                                  <AlertCircle className="absolute right-2.5 sm:right-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                                              )}
                                          </div>
                                          <AnimatePresence>
                                              {validationErrors.email && (
                                                  <motion.p
                                                      initial={{
                                                          opacity: 0,
                                                          height: 0,
                                                      }}
                                                      animate={{
                                                          opacity: 1,
                                                          height: "auto",
                                                      }}
                                                      exit={{
                                                          opacity: 0,
                                                          height: 0,
                                                      }}
                                                      className="text-xs sm:text-sm text-destructive"
                                                  >
                                                      {validationErrors.email}
                                                  </motion.p>
                                              )}
                                          </AnimatePresence>
                                      </div>

                                      {/* Mot de passe */}
                                      <div className="space-y-1 sm:space-y-2">
                                          <Label
                                              htmlFor="password"
                                              className="text-xs sm:text-sm font-medium"
                                          >
                                              Mot de passe
                                          </Label>
                                          <div className="relative">
                                              <Lock className="absolute left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                              <Input
                                                  id="password"
                                                  type={
                                                      showPassword
                                                          ? "text"
                                                          : "password"
                                                  }
                                                  placeholder="••••••••"
                                                  value={password}
                                                  onChange={
                                                      handlePasswordChange
                                                  }
                                                  className={`pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 lg:h-11 text-sm transition-all ${
                                                      validationErrors.password
                                                          ? "border-[hsl(var(--destructive)/0.3)] focus:border-destructive"
                                                          : password &&
                                                            !validationErrors.password
                                                          ? "border-[hsl(var(--secondary)/0.3)] focus:border-secondary"
                                                          : ""
                                                  }`}
                                                  required
                                              />
                                              <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="absolute right-0 top-0 h-full w-8 sm:w-10 px-2 sm:px-3 hover:bg-transparent"
                                                  onClick={() =>
                                                      setShowPassword(
                                                          !showPassword
                                                      )
                                                  }
                                              >
                                                  {showPassword ? (
                                                      <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                                                  ) : (
                                                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                                  )}
                                              </Button>
                                          </div>
                                          <AnimatePresence>
                                              {validationErrors.password && (
                                                  <motion.p
                                                      initial={{
                                                          opacity: 0,
                                                          height: 0,
                                                      }}
                                                      animate={{
                                                          opacity: 1,
                                                          height: "auto",
                                                      }}
                                                      exit={{
                                                          opacity: 0,
                                                          height: 0,
                                                      }}
                                                      className="text-xs sm:text-sm text-destructive"
                                                  >
                                                      {
                                                          validationErrors.password
                                                      }
                                                  </motion.p>
                                              )}
                                          </AnimatePresence>
                                      </div>

                                      {/* Options */}
                                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-4">
                                          <div className="flex items-center space-x-2">
                                              <Checkbox
                                                  id="remember"
                                                  checked={rememberMe}
                                                  onCheckedChange={checked =>
                                                      setRememberMe(
                                                          checked as boolean
                                                      )
                                                  }
                                              />
                                              <Label
                                                  htmlFor="remember"
                                                  className="text-xs sm:text-sm text-gray-600"
                                              >
                                                  Se souvenir de moi
                                              </Label>
                                          </div>
                                          <Link
                                              to="/auth/reset-password"
                                              className="text-xs sm:text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                                          >
                                              Mot de passe oublié ?
                                          </Link>
                                      </div>

                                      {/* Bouton de connexion */}
                                      <Button
                                          type="submit"
                                          className="w-full h-9 sm:h-10 lg:h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 transform hover:scale-[1.02] text-sm sm:text-base"
                                          disabled={isLoading || !isFormValid}
                                      >
                                          <AnimatePresence mode="wait">
                                              {isLoading ? (
                                                  <motion.div
                                                      key="loading"
                                                      initial={{ opacity: 0 }}
                                                      animate={{ opacity: 1 }}
                                                      exit={{ opacity: 0 }}
                                                      className="flex items-center gap-1.5 sm:gap-2"
                                                  >
                                                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                                      <span className="text-xs sm:text-sm">
                                                          Connexion...
                                                      </span>
                                                  </motion.div>
                                              ) : showSuccess ? (
                                                  <motion.div
                                                      key="success"
                                                      initial={{
                                                          opacity: 0,
                                                          scale: 0.8,
                                                      }}
                                                      animate={{
                                                          opacity: 1,
                                                          scale: 1,
                                                      }}
                                                      exit={{ opacity: 0 }}
                                                      className="flex items-center gap-1.5 sm:gap-2"
                                                  >
                                                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                                      <span className="text-xs sm:text-sm">
                                                          Connecté !
                                                      </span>
                                                  </motion.div>
                                              ) : (
                                                  <motion.div
                                                      key="default"
                                                      initial={{ opacity: 0 }}
                                                      animate={{ opacity: 1 }}
                                                      exit={{ opacity: 0 }}
                                                      className="flex items-center gap-1.5 sm:gap-2"
                                                  >
                                                      <span className="text-xs sm:text-sm">
                                                          Se connecter
                                                      </span>
                                                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>
                                      </Button>

                                      {/* Lien d'inscription */}
                                      <div className="text-center text-xs sm:text-sm">
                                          <span className="text-gray-600">
                                              Pas encore de compte ?{" "}
                                          </span>
                                          <Link
                                              to="/auth/register"
                                              className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
                                          >
                                              Créer un compte
                                          </Link>
                                      </div>
                                  </motion.form>
                              </CardContent>
                          </Card>

                          {/* Footer avec informations */}
                          <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8 }}
                              className="mt-4 sm:mt-6 lg:mt-8 text-center text-xs sm:text-sm text-gray-500"
                          >
                              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-2">
                                  <Link
                                      to="/privacy"
                                      className="hover:text-gray-700 transition-colors"
                                  >
                                      Confidentialité
                                  </Link>
                                  <span className="hidden xs:inline">•</span>
                                  <Link
                                      to="/terms"
                                      className="hover:text-gray-700 transition-colors"
                                  >
                                      Conditions
                                  </Link>
                                  <span className="hidden xs:inline">•</span>
                                  <Link
                                      to="/support"
                                      className="hover:text-gray-700 transition-colors"
                                  >
                                      Support
                                  </Link>
                              </div>
                              <p className="text-xs">
                                  © 2024 PanelFlow. Tous droits réservés.
                              </p>
                          </motion.div>
                      </div>
                  </motion.div>
              </div>
          </div>
      </div>
  )
}