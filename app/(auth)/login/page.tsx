import Link from "next/link";
import { LoginForm } from "../_components/login-form";
import { instrumentSerif } from "@/lib/fonts";

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
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#111118" }}>
          Welcome back
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>Sign in to continue.</p>
      </div>
      {error === "invalid_confirmation_link" ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          That link is invalid or has expired. Please try again.
        </p>
      ) : null}
      <LoginForm next={next} />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        New to ORYN?{" "}
        <Link href="/signup" className="font-semibold" style={{ color: "#3D35E8" }}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
