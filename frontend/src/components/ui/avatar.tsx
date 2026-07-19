import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  className,
  size = "md",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          "rounded-full ring-2 ring-white/10 object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold ring-2 ring-white/10",
        sizeClass,
        className,
      )}
    >
      {alt.charAt(0).toUpperCase()}
    </div>
  );
}
