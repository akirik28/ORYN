import Link from "next/link";
import { LoginForm } from "../_components/login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue building your profile.</p>
      </div>
      {error === "invalid_confirmation_link" ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          That link is invalid or has expired. Please try again.
        </p>
      ) : null}
      <LoginForm next={next} />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
