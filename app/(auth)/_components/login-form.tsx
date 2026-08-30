"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_STYLE } from "./auth-field-styles";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="email" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className={AUTH_INPUT_CLASS} />
        {state?.errors?.email ? <p className="text-sm text-destructive">{state.errors.email[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" style={{ color: "#3A3A4A", fontWeight: 500 }}>
            Password
          </Label>
          <Link href="/forgot-password" className="text-xs" style={{ color: "#3D35E8" }}>
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={AUTH_INPUT_CLASS}
        />
        {state?.errors?.password ? (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        ) : null}
      </div>
      {state?.message && state.variant === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" className="w-full text-white hover:opacity-90" style={AUTH_SUBMIT_STYLE} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
