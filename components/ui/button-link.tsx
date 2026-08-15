import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "./button";

interface ButtonLinkProps extends VariantProps<typeof buttonVariants> {
  href: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
  "aria-label"?: string;
}

/**
 * A Button styled as navigation. Base UI's Button defaults to `nativeButton={true}` (it
 * expects the `render` target to be a real <button>) — rendering it as a Next <Link>
 * without `nativeButton={false}` logs an accessibility warning and drops proper
 * keyboard/ARIA handling for the non-button element. Use this instead of
 * `<Button render={<Link .../>}>` directly so that's never forgotten.
 */
export function ButtonLink({ href, variant, size, className, children, target, rel, ...rest }: ButtonLinkProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={<Link href={href} target={target} rel={rel} {...rest} />}
    >
      {children}
    </Button>
  );
}
