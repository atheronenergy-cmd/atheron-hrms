import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { AuthLayoutShell } from "@/components/layout/auth-layout-shell";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayoutShell
      title="Forgot password"
      description="Enter your email and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthLayoutShell>
  );
}
