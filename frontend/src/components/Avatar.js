import { useState } from "react";

const SIZES = {
  sm: "w-10 h-10 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
  xl: "w-28 h-28 sm:w-36 sm:h-36 text-4xl",
};

export default function Avatar({ name, photo, size = "md", tone = "light" }) {
  const [failed, setFailed] = useState(false);
  const parts = name.split(" ");
  const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
  const bg = tone === "dark" ? "bg-ink-raised text-mute" : "bg-[#e2ddd2] text-mute";

  return (
    <div className={`${SIZES[size]} ${bg} display flex-shrink-0 overflow-hidden rounded-full flex items-center justify-center`}>
      {photo && !failed ? (
        <img src={`/fighters/${photo}`} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        initials
      )}
    </div>
  );
}
