import { LoginForm, type Mode } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode: Mode = mode === "signup" ? "signup" : "signin";
  return <LoginForm initialMode={initialMode} />;
}
