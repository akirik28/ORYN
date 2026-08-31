"use client";

import { useActionState } from "react";
import { signUp } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_STYLE } from "./auth-field-styles";
import { SignUpConsent } from "./signup-consent";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);

  if (state?.variant === "success") {
    return (
      <p className="rounded-[10px] px-3.5 py-2.5 text-sm" style={{ background: "#EBF6F0", color: "#1C7A4A" }}>
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          Display name
        </Label>
        <Input id="displayName" name="displayName" autoComplete="name" required className={AUTH_INPUT_CLASS} />
        {state?.errors?.displayName ? (
          <p className="text-sm text-destructive">{state.errors.displayName[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className={AUTH_INPUT_CLASS} />
        {state?.errors?.email ? <p className="text-sm text-destructive">{state.errors.email[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={AUTH_INPUT_CLASS}
        />
        <p className="text-xs" style={{ color: "#AAAABC" }}>At least 8 characters, with a letter and a number.</p>
        {state?.errors?.password ? (
          <p className="text-sm text-destructive">{state.errors.password[0]}</p>
        ) : null}
      </div>
      <SignUpConsent error={state?.errors?.acceptedTerms?.[0]} />
      {state?.message && state.variant === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit" className="w-full text-white hover:opacity-90" style={AUTH_SUBMIT_STYLE} disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
