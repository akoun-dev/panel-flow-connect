import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.panelflow.com',
  appName: 'Panelflow',
  webDir: 'dist',
  
  // Configuration du serveur
  server: {
    androidScheme: 'https', // Évite les problèmes de CORS sur Android
    cleartext: false // Force HTTPS pour la sécurité
  },

  // Plugins natifs
  plugins: {
    // Barre de statut
    StatusBar: {
      backgroundColor: 'hsl(0 0% 100%)', // Adaptez à votre thème
      style: 'Light', // ou 'Dark' selon votre design
      overlaysWebView: false
    },

    // Zone sécurisée (notch, barres système)
    SafeArea: {
      enabled: true,
      customColorsForSystemBars: true,
      statusBarBackgroundColor: 'hsl(0 0% 100%)',
      navigationBarBackgroundColor: 'hsl(0 0% 100%)'
    },

    // Écran de démarrage
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: 'hsl(0 0% 100%)',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },

    // Clavier virtuel
    Keyboard: {
      resize: 'body', // Redimensionne le contenu quand le clavier apparaît
      resizeOnFullScreen: true
    },

    // Notifications push (si nécessaire)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },

  // Configuration Android spécifique
  android: {
    buildOptions: {
      keystorePath: undefined, // Chemin vers votre keystore pour la prod
      keystoreAlias: undefined
    }
  },

  // Configuration iOS spécifique
  // ios: {
  //   scheme: 'Panelflow',
  //   cordovaSwiftVersion: '5.0'
  // }
};

export default config;