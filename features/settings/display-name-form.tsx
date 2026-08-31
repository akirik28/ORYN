"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName } from "@/app/(app)/settings/actions";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    // error rendered below the row, not as a third item inside it — every sibling form
    // (capacity/citizenship/location/password/visibility) already does this; here it sat
    // in the same unwrapped `flex items-end` row as the Input and Button, so on a genuine
    // save failure at <=375px the three competed for one row with only the Input (`flex-1`)
    // willing to shrink.
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input id="display-name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </div>
        <Button
          variant="outline"
          disabled={isPending || !name.trim() || name.trim() === initialName}
          onClick={() =>
            startTransition(async () => {
              const result = await updateDisplayName(name);
              if (result.error) setError(result.error);
              else setSaved(true);
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? "Saved" : "Save"}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
