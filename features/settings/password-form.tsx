"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/app/(app)/settings/actions";

/**
 * Change password from Settings.
 *
 * Collapsed behind a button rather than sitting open: two password fields permanently
 * visible make an account page look like something is wrong, and the great majority of
 * visits here are for something else.
 *
 * The confirm field is checked on the client only, and deliberately — it exists to catch
 * a typo, which is a client-side concern. The strength rules that actually matter are
 * enforced server-side by `UpdatePasswordSchema`, so a bypassed browser check cannot
 * weaken anything.
 */
export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    startTransition(async () => {
      const result = await changePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Clear immediately — leaving a password sitting in component state after it's been
      // accepted has no purpose and keeps it in memory longer than needed.
      setPassword("");
      setConfirm("");
      setSaved(true);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => { setOpen(true); setSaved(false); }}>
          Change password
        </Button>
        {saved ? <p className="text-sm text-success">Password updated.</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-ink-3">At least 8 characters, with a letter and a number.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={isPending || password.length === 0 || confirm.length === 0}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => { setOpen(false); setPassword(""); setConfirm(""); setError(null); }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
