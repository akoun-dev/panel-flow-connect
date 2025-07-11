
import { RegisterForm } from "@/components/auth/RegisterForm";

export function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">PanelFlow</h1>
          <p className="text-muted-foreground">Plateforme de gestion de panels</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
