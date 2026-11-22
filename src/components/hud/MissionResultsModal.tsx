import { Award, BarChart3, CheckCircle2, LayoutGrid, RotateCcw, Sparkles } from 'lucide-react';
import { getScenarioDefinition } from '../../simulation/scenarios/scenarioRegistry';
import { useSimStore } from '../../store/useSimStore';

export function MissionResultsModal() {
  const world = useSimStore((s) => s.worldSnapshot);
  const phase = useSimStore((s) => s.phase);
  const resetMission = useSimStore((s) => s.resetMission);
  const startShowcase = useSimStore((s) => s.startShowcase);
  const setArenaOpen = useSimStore((s) => s.setArenaOpen);
  const setComparisonOpen = useSimStore((s) => s.setComparisonOpen);

  if (phase !== 'completed') return null;

  const m = world.metrics;
  const score = world.scoreReport;
  const scenarioDef = getScenarioDefinition(world.scenario);
  const isComplete = world.missionOutcome === 'complete' && m.cropsRemaining === 0;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#041009]/72 p-4 md:p-6">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto hud-scroll rounded-xl bg-[#06180f]/96 border border-lime-400/45 p-6 shadow-2xl">
        {/* Header + Total Score */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-800/60">
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={`w-8 h-8 shrink-0 ${isComplete ? 'text-lime-400' : 'text-amber-400'}`}
            />
            <div>
              <div className="text-[11px] font-mono-num text-cyan-300 uppercase">
                Scenario {scenarioDef.code} · {scenarioDef.name}
              </div>
              <h2 className="font-display text-2xl font-bold text-emerald-50">
                {score ? `Mission ${score.status}` : isComplete ? 'Mission Complete' : 'Mission Incomplete'}
              </h2>
              <p className="text-xs text-emerald-200/80">{world.outcomeReason}</p>
            </div>
          </div>

          {score && (
            <div className="flex items-center gap-3 bg-[#092014] border border-cyan-400/45 rounded-lg px-4 py-2.5">
              <div className="text-right">
                <div className="text-[10px] text-emerald-300/70 uppercase">Final Score</div>
                <div className="font-mono-num text-2xl font-bold text-lime-300">
                  {score.totalScore}
                  <span className="text-sm text-emerald-300/70">/100</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-lime-400 text-slate-950 font-display text-xl font-bold flex items-center justify-center">
                {score.grade}
              </div>
            </div>
          )}
        </div>

        {/* Weighted Score Categories */}
        {score && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { label: 'Harvesting (35%)', val: score.breakdown.harvesting, max: 35, bar: 'bg-lime-400' },
              { label: 'Safety (30%)', val: score.breakdown.safety, max: 30, bar: 'bg-emerald-400' },
              { label: 'Energy (20%)', val: score.breakdown.energy, max: 20, bar: 'bg-cyan-400' },
              { label: 'Coordination (15%)', val: score.breakdown.coordination, max: 15, bar: 'bg-sky-400' },
            ].map((cat) => (
              <div
                key={cat.label}
                className="rounded-lg bg-[#092014] border border-emerald-800/60 p-2.5"
              >
                <div className="flex items-center justify-between text-[11px] text-emerald-200/85">
                  <span>{cat.label}</span>
                  <span className="font-mono-num font-bold text-emerald-50">
                    {cat.val}/{cat.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-xs bg-emerald-950 overflow-hidden">
                  <div
                    className={`h-full ${cat.bar}`}
                    style={{ width: `${(cat.val / cat.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Real Verified Telemetry Grid */}
        <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-2.5">
          {[
            { label: 'Harvested', value: `${m.cropsHarvested}/${m.viableCrops}`, tone: 'text-lime-300' },
            { label: 'Duration', value: `${m.missionDuration.toFixed(1)}s`, tone: 'text-cyan-300' },
            { label: 'Energy Used', value: `${m.energyConsumed.toFixed(1)}u`, tone: 'text-cyan-300' },
            { label: 'Collisions', value: `${m.collisionEvents}`, tone: m.collisionEvents === 0 ? 'text-lime-300' : 'text-rose-400' },
            { label: 'Safety Violations', value: `${m.safetyViolations}`, tone: m.safetyViolations === 0 ? 'text-lime-300' : 'text-rose-400' },
            { label: 'Near Collisions', value: `${m.nearCollisions}`, tone: 'text-amber-300' },
            { label: 'Route Replans', value: `${m.routeReplans}`, tone: 'text-cyan-300' },
            { label: 'Charge Wait', value: `${m.chargingWaitTime.toFixed(1)}s`, tone: 'text-sky-300' },
            { label: 'Reassignments', value: `${m.taskReassignments}`, tone: 'text-emerald-100' },
            { label: 'Recoveries', value: `${m.deadlockRecoveries + m.relocalizationEvents}`, tone: 'text-emerald-100' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[#092014] border border-emerald-800/50 p-2.5"
            >
              <div className="text-[10px] text-emerald-300/65">{stat.label}</div>
              <div className={`mt-0.5 font-mono-num text-sm font-bold ${stat.tone}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Achievements + Key Decisions & Recoveries */}
        {score && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#092014] border border-emerald-800/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-lime-300 mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Verified Achievements & Key Decisions</span>
              </div>
              {score.achievements.length > 0 && (
                <div className="text-[11px] text-cyan-200 mb-2">
                  {score.achievements.join(' · ')}
                </div>
              )}
              <ul className="flex flex-col gap-1 text-[11px] text-emerald-100/80">
                {score.keyDecisions.length > 0 ? (
                  score.keyDecisions.map((d, i) => <li key={i}>• {d}</li>)
                ) : (
                  <li>• Standard autonomous harvest sweep completed</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg bg-[#092014] border border-emerald-800/50 p-3">
              <div className="text-xs font-bold text-amber-300 mb-2">
                Disruptions & Autonomous Recoveries
              </div>
              <ul className="flex flex-col gap-1 text-[11px] text-emerald-100/80">
                {score.failuresAndRecoveries.length > 0 ? (
                  score.failuresAndRecoveries.map((f, i) => <li key={i}>• {f}</li>)
                ) : (
                  <li>• Nominal field run with zero disruptions encountered</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setArenaOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0c2719] hover:bg-[#123825] border border-cyan-500/40 text-xs font-semibold text-cyan-200 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Challenge Arena</span>
            </button>
            <button
              onClick={() => setComparisonOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0c2719] hover:bg-[#123825] border border-emerald-700 text-xs font-semibold text-emerald-100 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-lime-300" />
              <span>Compare Challenges</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => resetMission()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0c2719] hover:bg-[#123825] border border-emerald-700 text-xs font-semibold text-emerald-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
              <span>Retry Scenario</span>
            </button>
            <button
              onClick={startShowcase}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-display text-xs font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Replay Showcase</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
