import { useCountUp } from "../lib";

const STEPS = [
  {
    title: "Elo, fight by fight",
    body: "Every fighter starts at 1000. Beating a higher-rated opponent moves more points than beating a lower-rated one, the same way chess ratings work.",
  },
  {
    title: "Context matters",
    body: "Title fights, finishes, main events, and strength of schedule scale how much a result counts. Sustained title defenses compound.",
  },
  {
    title: "Recency rules",
    body: "Inactivity decays current ratings and champions get a boost while they hold the belt. All-time rankings use each fighter's peak.",
  },
];

function BigStat({ value, label }) {
  const n = useCountUp(value == null ? null : value * 100);
  return (
    <div>
      <div className="display text-[96px] sm:text-[120px] num">{value == null ? "—" : `${Math.round(n)}%`}</div>
      <div className="eyebrow mt-1 max-w-[15rem]">{label}</div>
    </div>
  );
}

export default function Methodology({ accuracy }) {
  return (
    <section id="methodology" className="mt-24 border-t-[3px] border-ink pt-10">
      <div className="mono text-sm text-blood">Methodology</div>
      <h2 className="display mt-1 text-[64px] sm:text-[96px]">How it works</h2>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="border-t-2 border-ink pt-4">
            <div className="display text-5xl text-blood num">0{i + 1}</div>
            <h3 className="mono mt-3 text-sm">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
          </div>
        ))}
      </div>

      {accuracy && (
        <div className="mt-14 grid gap-10 border-2 border-ink bg-paper p-6 sm:p-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          <div className="flex flex-wrap gap-10 lg:flex-col lg:gap-6">
            <BigStat value={accuracy.experienced?.accuracy} label="Higher-rated fighter wins (both with 3+ UFC fights)" />
            <BigStat value={accuracy.title_fights?.accuracy} label="In title fights" />
          </div>
          <div>
            <h3 className="display text-5xl">Does it know what it knows?</h3>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Every past fight replayed with each fighter's rating going in. When the model gives the favorite a given chance,
              here's how often the favorite actually won.
            </p>
            <div className="mt-6 space-y-4">
              {(accuracy.calibration || []).map((c) => (
                <div key={c.range} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3">
                  <span className="mono text-xs num">{c.range}</span>
                  <div className="relative h-6 bg-canvas">
                    <div className="absolute inset-y-0 left-0 bg-line" style={{ width: `${c.predicted * 100}%` }} />
                    <div className="absolute inset-y-[7px] left-0 origin-left bg-ink animate-draw-x" style={{ width: `${c.actual * 100}%` }} />
                  </div>
                  <span className="display text-right text-2xl num">{Math.round(c.actual * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="mono mt-4 flex gap-5 text-[10px] text-mute">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-line" />Predicted</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-4 bg-ink" />Actual</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
