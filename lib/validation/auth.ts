import { z } from "zod";

export const SignUpSchema = z.object({
  displayName: z.string().min(2, { error: "Enter at least 2 characters." }).max(80).trim(),
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
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
