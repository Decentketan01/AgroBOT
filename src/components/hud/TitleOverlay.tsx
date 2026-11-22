import { LayoutGrid, Play, Sparkles } from 'lucide-react';
import { SCENARIO_LIST } from '../../simulation/scenarios/scenarioRegistry';
import { ChallengeScenarioId } from '../../simulation/scenarios/scenarioTypes';
import { useSimStore } from '../../store/useSimStore';

const FEATURED_IDS: ChallengeScenarioId[] = [
  'showcase',
  'tractorCrossing',
  'humanSafety',
  'monsoonMud',
];

export function TitleOverlay() {
  const phase = useSimStore((s) => s.phase);
  const scenario = useSimStore((s) => s.scenario);
  const arenaOpen = useSimStore((s) => s.arenaOpen);
  const comparisonOpen = useSimStore((s) => s.comparisonOpen);
  const setScenario = useSimStore((s) => s.setScenario);
  const startMission = useSimStore((s) => s.startMission);
  const startShowcase = useSimStore((s) => s.startShowcase);
  const setArenaOpen = useSimStore((s) => s.setArenaOpen);

  if (phase !== 'briefing' || arenaOpen || comparisonOpen) return null;

  const featured = SCENARIO_LIST.filter((s) => FEATURED_IDS.includes(s.id));

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#041009]/55 p-6">
      <div className="max-w-xl w-full rounded-xl bg-[#06180f]/95 border border-cyan-400/35 p-6 shadow-2xl">
        {/* Custom SVG Emblem & Title Lockup */}
        <div className="flex items-center gap-3">
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="12,2 21,7 21,17 12,22 3,17 3,7"
              stroke="#22d3ee"
              strokeWidth="1.6"
              fill="#0b2819"
            />
            <circle cx="12" cy="12" r="3.6" fill="#a3e635" />
            <line x1="12" y1="2" x2="12" y2="8.4" stroke="#22d3ee" strokeWidth="1.4" />
            <line x1="21" y1="17" x2="15.2" y2="13.5" stroke="#22d3ee" strokeWidth="1.4" />
            <line x1="3" y1="17" x2="8.8" y2="13.5" stroke="#22d3ee" strokeWidth="1.4" />
          </svg>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-emerald-50">
              AgroSwarm 3D
            </h1>
            <p className="text-xs text-cyan-300/90 font-medium">
              Real-World Agricultural Robotics Challenge Arena
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-emerald-100/85 leading-relaxed">
          AgroSwarm does not just automate harvesting — it empowers autonomous robot teams to
          adapt when tractors cross lanes, farm workers enter rows, rain turns soil to mud, or
          chargers and radio links fail.
        </p>

        {/* Featured Challenge Quick-Pick */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-emerald-300/80">
              Featured Scenarios (14 Total in Challenge Arena)
            </span>
            <button
              onClick={() => setArenaOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-lime-300 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Browse All 14 Challenges</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {featured.map((sc) => {
              const active = scenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setScenario(sc.id)}
                  className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0d2e1d] border-cyan-400 text-emerald-50'
                      : 'bg-[#081d12] border-emerald-800/60 text-emerald-200/80 hover:border-emerald-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-xs font-bold truncate">{sc.name}</span>
                    <span className="font-mono-num text-[10px] text-cyan-300 shrink-0">
                      {sc.code}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-emerald-200/65 line-clamp-2">
                    {sc.realWorldProblem}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Launch CTAs */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            onClick={startShowcase}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-display text-sm font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>90s Autonomy Showcase</span>
          </button>

          <button
            onClick={() => setArenaOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0d2d1d] hover:bg-[#133d28] border border-cyan-400/55 text-cyan-200 font-display text-sm font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-cyan-400" />
            <span>Challenge Arena</span>
          </button>

          <button
            onClick={startMission}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display text-sm font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Start Mission</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-emerald-800/60 text-center text-[11px] text-emerald-300/75">
          Drag Orbit · Scroll Zoom · Click Robot Inspect · Space Pause · H Toggle HUD
        </div>
      </div>
    </div>
  );
}
