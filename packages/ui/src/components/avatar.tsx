import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../cn";

const avatarVariants = cva(
  "flex items-center justify-center rounded-full bg-primary/10 font-medium",
  {
    defaultVariants: {
      size: "md",
    },
    variants: {
      size: {
        lg: "size-12 text-base",
        md: "size-8 text-xs",
        sm: "size-6 text-[10px]",
      },
    },
  }
);

type AvatarVariants = VariantProps<typeof avatarVariants>;

interface AvatarProps extends AvatarVariants {
  className?: string;
  name?: string | null;
  src?: string | null;
}

const Avatar = ({ className, name, size, src }: AvatarProps) => {
  const initials = name?.charAt(0)?.toUpperCase() ?? "?";

  if (src) {
    return (
      <img
        alt={name ?? "Avatar"}
        className={cn(avatarVariants({ size }), "object-cover", className)}
        src={src}
      />
    );
  }

  return (
    <div className={cn(avatarVariants({ size }), className)}>{initials}</div>
  );
};

export { Avatar, avatarVariants };
export type { AvatarProps };
