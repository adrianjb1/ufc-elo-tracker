import { useState } from "react";

const SIZES = {
  sm: "w-10 h-10 text-xs",
  md: "w-14 h-14 text-sm",
  lg: "w-20 h-20 text-lg",
  xl: "w-24 h-24 text-xl",
};

export default function Avatar({ name, photos, size = "sm", ring = "" }) {
  const [failed, setFailed] = useState(false);
  const photo = photos[name];
  const parts = name.split(" ");
  const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();

  return (
    <div
      className={`${SIZES[size]} ${ring} flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center
        bg-gradient-to-br from-ink-700 to-ink-850 font-cond font-bold tracking-wide text-zinc-400`}
    >
      {photo && !failed ? (
        <img
          src={`/fighters/${photo}`}
          alt={name}
          className="w-full h-full object-cover object-top"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
