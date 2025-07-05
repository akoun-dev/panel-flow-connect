
import { LoginForm } from "@/components/auth/LoginForm";

export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  );
}
