import { cn } from "../cn";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "size-7 text-xs",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

const Avatar = ({ name, src, size = "md", className }: AvatarProps) => {
  const initials = name?.charAt(0)?.toUpperCase() ?? "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        className={cn("rounded-full object-cover", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-medium",
        sizeMap[size],
        className
      )}
    >
      {initials}
    </div>
  );
};

export { Avatar };
export type { AvatarProps };
