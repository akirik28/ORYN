import { z } from "zod";
import { legalCopy } from "@/lib/legal/content";

export const SignUpSchema = z.object({
  displayName: z.string().min(2, { error: "Enter at least 2 characters." }).max(80).trim(),
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
  /**
   * Acceptance of the Terms of Use and Privacy Notice, checked on the server rather than
   * trusted from the browser — an unchecked box that still creates an account would make
   * the consent surface decorative, and a record of consent that can be bypassed is worth
   * nothing to the lawyer who eventually has to rely on it.
   *
   * An unticked checkbox submits no field at all (not `false`), so the raw value here is
   * `"on"` or `null`; `preprocess` collapses both shapes before `literal(true)` produces
   * the one error message a student should ever see for this field.
   */
  acceptedTerms: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.literal(true, { error: legalCopy.signupConsent.checkboxRequiredError })
  ),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z.string().min(1, { error: "Enter your password." }),
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
});

export const UpdatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
});

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      variant?: "error" | "success";
    }
  | undefined;
