import Link from "next/link";
import { SignUpForm } from "../_components/signup-form";
import { instrumentSerif } from "@/lib/fonts";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#111118" }}>
          Create your account
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>Free for students. No credit card required.</p>
      </div>
      <SignUpForm />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-semibold" style={{ color: "#3D35E8" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
