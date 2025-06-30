
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">PanelFlow</h1>
          <p className="text-muted-foreground">Plateforme de gestion de panels</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
