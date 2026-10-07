import { useEffect, useRef, useState } from "react";

export const API = process.env.REACT_APP_API_URL || "";

export async function getJSON(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

export const MEN_CLASSES = [
  "flyweight", "bantamweight", "featherweight", "lightweight",
  "welterweight", "middleweight", "light heavyweight", "heavyweight",
];

export const WOMEN_CLASSES = [
  "women's strawweight", "women's flyweight", "women's bantamweight", "women's featherweight",
];

export const titleCase = (value) =>
  value.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

export const ufcProfileUrl = (name) => `https://www.ufc.com/athlete/${slugify(name)}`;

export const formatDate = (value, options = { year: "numeric", month: "short", day: "numeric" }) =>
  new Date(value).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

export const shortClass = (wc) =>
  (wc || "")
    .replace("Women's ", "W. ")
    .replace("Light Heavyweight", "Light Heavy");

export const statusKind = (status) => {
  if (!status) return null;
  if (status.startsWith("Champion")) return "champ";
  if (status.startsWith("Interim")) return "interim";
  return "former";
};

export const signed = (n, digits = 0) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const frame = useRef();

  useEffect(() => {
    if (target == null) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
