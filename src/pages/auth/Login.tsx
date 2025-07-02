
import { LoginForm } from "@/components/auth/LoginForm";

export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">PANELFLOW</h1>
          <p className="text-muted-foreground">Plateforme de gestion de panels</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
