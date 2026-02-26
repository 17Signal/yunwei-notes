import { LoginForm } from "@/components/login-form";
import { sanitizeNextPath } from "@/lib/auth-redirect";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <LoginForm nextPath={next} />
    </main>
  );
}
