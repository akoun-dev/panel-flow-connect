
import { RegisterForm } from "@/components/auth/RegisterForm";

export function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.15)] via-[hsl(var(--accent)/0.15)] to-[hsl(var(--secondary)/0.15)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">PanelFlow</h1>
          <p className="text-accent mb-2">Connect. Boost. Impact.</p>
          <p className="text-muted-foreground">Plateforme de gestion de panels</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
