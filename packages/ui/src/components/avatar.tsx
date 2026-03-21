import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

import { cn } from "../cn";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  lg: "size-10 text-sm",
  md: "size-8 text-xs",
  sm: "size-7 text-xs"
};

const Avatar = ({ name, src, size = "md", className }: AvatarProps) => {
  const initials = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <BaseAvatar.Root className={cn("rounded-full", sizeMap[size], className)}>
      {src && (
        <BaseAvatar.Image
          alt={name ?? "Avatar"}
          className="size-full rounded-full object-cover"
          src={src}
        />
      )}
      <BaseAvatar.Fallback className="flex size-full items-center justify-center rounded-full bg-primary/10 font-medium">
        {initials}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
};

export type { AvatarProps };
export { Avatar };
