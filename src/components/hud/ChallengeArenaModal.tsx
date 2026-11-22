import { useState } from 'react';
import { BarChart3, Clock, Cpu, Eye, Play, RotateCcw, X } from 'lucide-react';
import { SCENARIO_LIST } from '../../simulation/scenarios/scenarioRegistry';
import { ScenarioDefinition } from '../../simulation/scenarios/scenarioTypes';
import { useSimStore } from '../../store/useSimStore';

type ArenaFilter = 'all' | 'primary' | 'optional' | 'showcase';

function ScenarioIsometricPreview({ scenario }: { scenario: ScenarioDefinition }) {
  const accent = scenario.previewAccent;
  const secondary = scenario.previewSecondary;

  return (
    <svg
      viewBox="0 0 180 86"
      className="w-full h-22 rounded bg-[#071910] border border-emerald-800/60 shrink-0"
      aria-hidden="true"
    >
      {/* Isometric 3D farm base */}
      <polygon
        points="90,10 166,42 90,74 14,42"
        fill="#163522"
        stroke="#275639"
        strokeWidth="1.2"
      />
      {/* 3 isometric crop plot strips */}
      <polygon points="56,31 82,20 100,28 74,39" fill="#2c2015" opacity="0.9" />
      <polygon points="78,40 104,29 122,37 96,48" fill="#2c2015" opacity="0.9" />
      <polygon points="100,49 126,38 144,46 118,57" fill="#2c2015" opacity="0.9" />

      {/* Mini crop dots */}
      {[68, 86, 104].map((cx, i) => (
        <circle key={i} cx={cx} cy={31 + i * 7} r="2.2" fill="#a3e635" />
      ))}

      {/* Mini robot silhouettes */}
      <rect x="64" y="48" width="6" height="5" rx="1" fill="#22d3ee" />
      <rect x="92" y="54" width="6" height="5" rx="1" fill="#a3e635" />
      <rect x="116" y="44" width="6" height="5" rx="1" fill="#fbbf24" />

      {/* Scenario-specific visual hazard motif */}
      {scenario.id === 'tractorCrossing' && (
        <>
          <line x1="42" y1="44" x2="138" y2="34" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
          <rect x="86" y="34" width="12" height="8" rx="1.5" fill={accent} />
        </>
      )}
      {scenario.id === 'humanSafety' && (
        <>
          <circle cx="90" cy="40" r="14" fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="1.4" />
          <circle cx="90" cy="40" r="3.2" fill="#facc15" />
        </>
      )}
      {(scenario.id === 'monsoonMud' || scenario.id === 'waterlogging') && (
        <>
          <ellipse cx="88" cy="42" rx="18" ry="10" fill={accent} fillOpacity="0.35" stroke={secondary} strokeWidth="1.2" />
          <line x1="65" y1="16" x2="61" y2="28" stroke="#93c5fd" strokeWidth="1.2" />
          <line x1="95" y1="14" x2="91" y2="26" stroke="#93c5fd" strokeWidth="1.2" />
          <line x1="122" y1="18" x2="118" y2="30" stroke="#93c5fd" strokeWidth="1.2" />
        </>
      )}
      {scenario.id === 'gpsDegradation' && (
        <>
          <ellipse cx="76" cy="36" rx="20" ry="11" fill="#14532d" fillOpacity="0.7" stroke={secondary} strokeWidth="1.4" strokeDasharray="3 2" />
          <circle cx="76" cy="36" r="4" fill={secondary} opacity="0.8" />
        </>
      )}
      {scenario.id === 'dustVisibility' && (
        <ellipse cx="100" cy="40" rx="22" ry="12" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="1.2" />
      )}
      {scenario.id === 'blockedPath' && (
        <rect x="84" y="36" width="12" height="9" fill={accent} stroke="#fff" strokeWidth="0.7" />
      )}
      {scenario.id === 'chargerFailure' && (
        <>
          <rect x="52" y="52" width="10" height="7" fill="#ef4444" />
          <line x1="52" y1="52" x2="62" y2="59" stroke="#fff" strokeWidth="1.3" />
          <rect x="112" y="52" width="10" height="7" fill="#38bdf8" />
        </>
      )}
      {scenario.id === 'communicationLoss' && (
        <circle cx="90" cy="40" r="17" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="1.3" strokeDasharray="3 3" />
      )}
      {scenario.id === 'unevenTerrain' && (
        <polygon points="62,46 80,26 98,46" fill={accent} fillOpacity="0.45" stroke={accent} strokeWidth="1.2" />
      )}
      {scenario.id === 'missingCrops' && (
        <>
          <circle cx="74" cy="34" r="3" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
          <circle cx="108" cy="46" r="3" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
        </>
      )}
      {scenario.id === 'harvestDeadline' && (
        <>
          <circle cx="78" cy="34" r="5" fill="none" stroke="#f43f5e" strokeWidth="1.4" />
          <circle cx="108" cy="44" r="5" fill="none" stroke="#f43f5e" strokeWidth="1.4" />
        </>
      )}
      {scenario.id === 'showcase' && (
        <path
          d="M52,50 Q90,22 128,46"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.6"
          strokeDasharray="3 2"
        />
      )}
    </svg>
  );
}

export function ChallengeArenaModal() {
  const arenaOpen = useSimStore((s) => s.arenaOpen);
  const currentScenario = useSimStore((s) => s.scenario);
  const setArenaOpen = useSimStore((s) => s.setArenaOpen);
  const previewScenario = useSimStore((s) => s.previewScenario);
  const launchScenario = useSimStore((s) => s.launchScenario);
  const resetMission = useSimStore((s) => s.resetMission);
  const setComparisonOpen = useSimStore((s) => s.setComparisonOpen);

  const [filter, setFilter] = useState<ArenaFilter>('all');

  if (!arenaOpen) return null;

  const filtered = SCENARIO_LIST.filter((s) => {
    if (filter === 'primary') return !s.isOptional && !s.isShowcase && s.id !== 'baseline';
    if (filter === 'optional') return Boolean(s.isOptional);
    if (filter === 'showcase') return Boolean(s.isShowcase) || s.id === 'baseline';
    return true;
  });

  const diffTone = (d: ScenarioDefinition['difficulty']) => {
    if (d === 'Extreme') return 'text-rose-300 border-rose-500/40 bg-rose-500/10';
    if (d === 'Hard') return 'text-amber-300 border-amber-500/40 bg-amber-500/10';
    if (d === 'Moderate') return 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10';
    return 'text-lime-300 border-lime-500/40 bg-lime-500/10';
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#041009]/80 p-4 md:p-6">
      <div className="w-full max-w-6xl max-h-[90vh] rounded-xl bg-[#06180f] border border-cyan-500/35 shadow-2xl flex flex-col overflow-hidden">
        {/* Arena Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-emerald-800/70">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-emerald-50">
              Real-World Challenge Arena
            </h2>
            <p className="text-xs text-emerald-200/75 mt-0.5">
              Select a real agricultural disruption to test autonomous perception, A* replanning, safety stops, and fleet recovery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setComparisonOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0b2618] hover:bg-[#113523] border border-cyan-500/40 text-xs font-semibold text-cyan-300 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Compare Challenges</span>
            </button>
            <button
              onClick={() => setArenaOpen(false)}
              aria-label="Close Challenge Arena"
              className="p-1.5 rounded border border-emerald-800 text-emerald-200 hover:text-white hover:border-cyan-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#081d12] border-b border-emerald-800/50 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Scenarios (14)' },
              { id: 'primary', label: 'Primary Real-World (8)' },
              { id: 'optional', label: 'Additional Challenges (4)' },
              { id: 'showcase', label: 'Showcase & Baseline (2)' },
            ] as { id: ArenaFilter; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filter === t.id
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-[#0b2517] text-emerald-200/80 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scenario Cards Grid */}
        <div className="flex-1 overflow-y-auto hud-scroll p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sc) => {
            const isActive = currentScenario === sc.id;
            return (
              <div
                key={sc.id}
                className={`rounded-lg border p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                  isActive
                    ? 'bg-[#0b2719] border-cyan-400/75'
                    : 'bg-[#091f14] border-emerald-800/60 hover:border-emerald-600/80'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <ScenarioIsometricPreview scenario={sc} />

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="font-mono-num text-[11px] font-bold text-cyan-300">
                      SCENARIO {sc.code} · {sc.challengeType}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${diffTone(
                        sc.difficulty
                      )}`}
                    >
                      {sc.difficulty}
                    </span>
                  </div>

                  <h3 className="font-display text-sm font-bold text-emerald-50">
                    {sc.name}
                  </h3>

                  <p className="text-[11px] text-amber-200/85 leading-snug">
                    Problem: {sc.realWorldProblem}
                  </p>

                  <p className="text-[11px] text-emerald-100/75 leading-snug">
                    {sc.description}
                  </p>

                  <div className="text-[11px] text-lime-200/80 leading-snug pt-1 border-t border-emerald-800/40">
                    Expected: {sc.expectedBehaviour}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-emerald-800/50">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300/75">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      {sc.robotCount} Robots
                    </span>
                    <span className="flex items-center gap-1 font-mono-num">
                      <Clock className="w-3 h-3 text-lime-400" />
                      ~{sc.estimatedDurationSec}s demo
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => previewScenario(sc.id)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[#0d2a1b] hover:bg-[#133a26] border border-emerald-700/70 text-[11px] font-medium text-emerald-100 cursor-pointer"
                      title="Preview initial farm setup"
                    >
                      <Eye className="w-3 h-3 text-cyan-300" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => launchScenario(sc.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-lime-400 hover:bg-lime-300 text-slate-950 font-display text-[11px] font-bold cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Mission</span>
                    </button>

                    <button
                      onClick={() => resetMission(sc.id)}
                      className="p-1.5 rounded bg-[#0d2a1b] hover:bg-[#133a26] border border-emerald-700/70 text-emerald-200 cursor-pointer"
                      title="Reset scenario seed"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
