import { useState } from "react";

const SIZES = {
  sm: "w-10 h-10 text-[11px]",
  md: "w-12 h-12 text-xs",
  lg: "w-20 h-20 text-base",
};

export default function Avatar({ name, photo, size = "md" }) {
  const [failed, setFailed] = useState(false);
  const parts = name.split(" ");
  const initials = (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();

  return (
    <div className={`${SIZES[size]} wide flex-shrink-0 overflow-hidden rounded-full bg-[#ebebe8] flex items-end justify-center font-extrabold text-mute`}>
      {photo && !failed ? (
        <img
          src={`/fighters/${photo}`}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="self-center">{initials}</span>
      )}
    </div>
  );
}
