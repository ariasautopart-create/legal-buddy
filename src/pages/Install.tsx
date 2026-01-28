import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, CheckCircle, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">¡Aplicación Instalada!</CardTitle>
            <CardDescription>
              ARIAS LEGAL GESTIÓN ya está instalada en tu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Scale className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">ARIAS LEGAL GESTIÓN</CardTitle>
          <CardDescription>
            Instala la aplicación para acceder rápidamente y trabajar sin conexión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Beneficios */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Monitor className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Acceso directo desde escritorio</p>
                <p className="text-xs text-muted-foreground">Abre la app con un solo clic</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Funciona sin conexión</p>
                <p className="text-xs text-muted-foreground">Consulta información incluso offline</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Actualizaciones automáticas</p>
                <p className="text-xs text-muted-foreground">Siempre tendrás la última versión</p>
              </div>
            </div>
          </div>

          {/* Botón de instalación o instrucciones */}
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Instalar Aplicación
            </Button>
          ) : isIOS ? (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-medium text-sm">Para instalar en iOS:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Toca el botón Compartir en Safari</li>
                <li>Selecciona "Añadir a pantalla de inicio"</li>
                <li>Confirma tocando "Añadir"</li>
              </ol>
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Abre esta página en Chrome, Edge o Safari para instalar la aplicación.
              </p>
            </div>
          )}

          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            className="w-full"
          >
            Continuar en el navegador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
