import { BarChart3, Play, RefreshCw, X } from 'lucide-react';
import { useSimStore } from '../../store/useSimStore';

export function ComparisonModal() {
  const open = useSimStore((s) => s.comparisonOpen);
  const results = useSimStore((s) => s.comparisonResults);
  const setOpen = useSimStore((s) => s.setComparisonOpen);
  const runComparisonSuite = useSimStore((s) => s.runComparisonSuite);
  const launchScenario = useSimStore((s) => s.launchScenario);

  if (!open) return null;

  const list = results ?? [];
  const maxEnergy = Math.max(100, ...list.map((r) => r.energyConsumed));
  const maxDuration = Math.max(40, ...list.map((r) => r.durationSec));
  const maxEvents = Math.max(5, ...list.map((r) => Math.max(r.safetyEvents, r.recoveryEvents)));

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#041009]/80 p-4 md:p-6">
      <div className="w-full max-w-5xl max-h-[88vh] rounded-xl bg-[#06180f] border border-cyan-500/35 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-800/70">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-emerald-50">
                Real-Simulation Challenge Comparison
              </h2>
              <p className="text-xs text-emerald-200/75">
                Headless deterministic runs comparing Baseline, Monsoon Mud, Heavy Obstacles, Charger Failure, and Comm Loss.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runComparisonSuite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0b2618] hover:bg-[#123825] border border-cyan-500/40 text-xs font-semibold text-cyan-300 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Suite</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close Comparison View"
              className="p-1.5 rounded border border-emerald-800 text-emerald-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hud-scroll p-5 flex flex-col gap-5">
          {/* Visual Comparative Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Energy Consumption & Completion Chart */}
            <div className="rounded-lg bg-[#091f14] border border-emerald-800/60 p-4">
              <h3 className="font-display text-xs font-bold text-cyan-300 uppercase tracking-wide mb-3">
                Energy Consumed (units) & Completion (%)
              </h3>
              <div className="flex flex-col gap-2.5">
                {list.map((row) => (
                  <div key={row.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-100 font-medium truncate">{row.label}</span>
                      <span className="font-mono-num text-cyan-300 shrink-0">
                        {row.energyConsumed}u · {row.completionRate}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-xs bg-emerald-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-lime-400"
                        style={{ width: `${(row.energyConsumed / maxEnergy) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Time & Safety/Recovery Activity Chart */}
            <div className="rounded-lg bg-[#091f14] border border-emerald-800/60 p-4">
              <h3 className="font-display text-xs font-bold text-lime-300 uppercase tracking-wide mb-3">
                Completion Time (s) & Adaptive Events
              </h3>
              <div className="flex flex-col gap-2.5">
                {list.map((row) => (
                  <div key={row.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-100 font-medium truncate">{row.label}</span>
                      <span className="font-mono-num text-amber-300 shrink-0">
                        {row.durationSec}s · {row.safetyEvents} safety / {row.recoveryEvents} recovery
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-2 rounded-xs bg-emerald-950 overflow-hidden">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${(row.durationSec / maxDuration) * 100}%` }}
                        />
                      </div>
                      <div className="h-2 rounded-xs bg-emerald-950 overflow-hidden">
                        <div
                          className="h-full bg-rose-400"
                          style={{
                            width: `${(Math.max(row.safetyEvents, row.recoveryEvents) / maxEvents) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real Metrics Table */}
          <div className="rounded-lg bg-[#091f14] border border-emerald-800/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b2719] text-emerald-300/80 border-b border-emerald-800/70">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Scenario</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Harvest %</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Energy</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Time</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Safety Events</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Recoveries</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Score</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50">
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-[#0c291b]">
                    <td className="px-3 py-2 font-medium text-emerald-50">{row.label}</td>
                    <td className="px-3 py-2 font-mono-num text-right text-lime-300">
                      {row.completionRate}%
                    </td>
                    <td className="px-3 py-2 font-mono-num text-right text-cyan-300">
                      {row.energyConsumed}u
                    </td>
                    <td className="px-3 py-2 font-mono-num text-right text-emerald-100">
                      {row.durationSec}s
                    </td>
                    <td className="px-3 py-2 font-mono-num text-right text-amber-300">
                      {row.safetyEvents}
                    </td>
                    <td className="px-3 py-2 font-mono-num text-right text-sky-300">
                      {row.recoveryEvents}
                    </td>
                    <td className="px-3 py-2 font-mono-num text-right font-bold text-lime-300">
                      {row.totalScore}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => launchScenario(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-[11px] font-semibold text-cyan-200 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Run Live</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
