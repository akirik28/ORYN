"use client"

import { useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // Reads the `.dark` ancestor class directly — the same thing globals.css keys off via
  // `@custom-variant dark` — instead of asserting a literal theme name. A hardcoded value
  // here is exactly how this went wrong before: it said "dark" for three days after
  // app/layout.tsx switched the app's actual default to light, because nothing kept the
  // two in sync. No next-themes provider is mounted (see that file's comment for why —
  // there's no toggle yet, so nothing to subscribe to); once one exists and sets `.dark`
  // during SSR too, this keeps working with no further change here.
  const [theme] = useState<ToasterProps["theme"]>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  )

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
