import { notFound } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/app/(auth)/_components/login-form";
import { SignUpForm } from "@/app/(auth)/_components/signup-form";
import { ForgotPasswordForm } from "@/app/(auth)/_components/forgot-password-form";
import { inter, instrumentSerif } from "@/lib/fonts";

// Dev-only visual harness for the Figma-source auth screens (login/signup/forgot-password),
// same pattern as ../quick-add/page.tsx. Reproduces app/(auth)/layout.tsx's gradient+card
// wrapper directly rather than importing it, because that layout gates on
// integrationStatus.supabase — this sandbox has none, and the point of this page is to
// browser-verify the card/typography/field styling without needing it. The forms rendered
// inside are the real ones (real Server Actions on submit); only viewed unsubmitted here.
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div
        className="relative flex flex-col items-center overflow-hidden px-4 py-12"
        style={{ background: "linear-gradient(145deg, #DDDAF5 0%, #D4DBF0 100%)" }}
      >
        <Image src="/brand/logo-full.png" alt="Oryn" width={104} height={35} className="relative mb-8 h-8 w-auto" />
        <div
          className={`${inter.className} relative w-full max-w-sm rounded-[24px] p-10`}
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)", boxShadow: "0 24px 80px rgba(61,53,232,0.12)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AuthPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const h1Style = { fontFamily: instrumentSerif.style.fontFamily, fontWeight: 400, color: "#111118" };

  return (
    <div className="space-y-16 bg-background p-8">
      <Card title="Login">
        <div className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 style={{ ...h1Style, fontSize: 28 }}>Welcome back</h1>
            <p className="text-sm" style={{ color: "#7A7A8A" }}>Sign in to continue.</p>
          </div>
          <LoginForm />
          <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
            New to ORYN? <span className="font-semibold" style={{ color: "#3D35E8" }}>Create an account</span>
          </p>
        </div>
      </Card>

      <Card title="Signup">
        <div className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 style={{ ...h1Style, fontSize: 28 }}>Create your account</h1>
            <p className="text-sm" style={{ color: "#7A7A8A" }}>Free for students. No credit card required.</p>
          </div>
          <SignUpForm />
        </div>
      </Card>

      <Card title="Forgot password">
        <div className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 style={{ ...h1Style, fontSize: 26 }}>Reset your password</h1>
            <p className="text-sm" style={{ color: "#7A7A8A" }}>Enter your email and we&apos;ll send a reset link if an account exists.</p>
          </div>
          <ForgotPasswordForm />
        </div>
      </Card>
    </div>
  );
}
