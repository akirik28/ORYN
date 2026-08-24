import Link from "next/link";
import { SignUpForm } from "../_components/signup-form";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start mapping what to do next.</p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
