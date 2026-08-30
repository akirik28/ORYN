import type { CSSProperties } from "react";

// Shared field/button treatment for the four auth forms — literal source values
// (AuthFlow.tsx `Login`/`Signup`/`ForgotPassword`), factored out once rather than
// repeated per input across four files.
export const AUTH_INPUT_CLASS =
  "h-11 rounded-[11px] border-[1.5px] border-[#E4E4EE] px-3.5 text-sm text-[#111118] placeholder:text-[#AAAABC]";

export const AUTH_SUBMIT_STYLE: CSSProperties = {
  background: "#3D35E8",
  height: 46,
  borderRadius: 12,
  fontWeight: 600,
};
