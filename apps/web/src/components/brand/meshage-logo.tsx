import { useId } from "react";

interface MeshageLogoProps {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}

export function MeshageLogo({
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
}: MeshageLogoProps) {
  const gradientId = `meshage-mark-gradient-${useId().replaceAll(":", "")}`;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg
        aria-hidden="true"
        className={`size-10 shrink-0 drop-shadow-lg ${markClassName ?? ""}`}
        fill="none"
        viewBox="0 0 48 48"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="5"
            x2="44"
            y1="3"
            y2="46"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#7189ff" />
            <stop offset="1" stopColor="#514bd8" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="16"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M27 11.5h7a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6h-1.2l-4.7 4v-4H27a6 6 0 0 1-6-6v-5a6 6 0 0 1 6-6Z"
          fill="#DCE3FF"
          opacity=".92"
        />
        <path
          d="M13 15h12a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6l-6 5v-5a6 6 0 0 1-6-6v-6a6 6 0 0 1 6-6Z"
          fill="white"
        />
        <circle cx="15" cy="24" r="1.6" fill="#596DE0" />
        <circle cx="20" cy="24" r="1.6" fill="#596DE0" />
        <circle cx="25" cy="24" r="1.6" fill="#596DE0" />
      </svg>
      {showWordmark && (
        <span
          className={`text-xl font-semibold tracking-tight text-foreground ${wordmarkClassName ?? ""}`}
        >
          Meshage<span className="text-primary">.</span>
        </span>
      )}
    </span>
  );
}
