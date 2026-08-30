"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_STYLE } from "./auth-field-styles";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (state?.variant === "success") {
    return (
      <div className="space-y-1 py-2 text-center">
        <p className="text-3xl">✉️</p>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" style={{ color: "#3A3A4A", fontWeight: 500 }}>
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className={AUTH_INPUT_CLASS} />
        {state?.errors?.email ? <p className="text-sm text-destructive">{state.errors.email[0]}</p> : null}
      </div>
      <Button type="submit" className="w-full text-white hover:opacity-90" style={AUTH_SUBMIT_STYLE} disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
