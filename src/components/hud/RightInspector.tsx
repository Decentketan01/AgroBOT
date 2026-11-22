import { Crosshair } from 'lucide-react';
import { useSimStore } from '../../store/useSimStore';

export function RightInspector() {
  const robots = useSimStore((s) => s.worldSnapshot.robots);
  const selectedRobotId = useSimStore((s) => s.selectedRobotId);
  const setCameraMode = useSimStore((s) => s.setCameraMode);

  const robot = robots.find((r) => r.id === selectedRobotId) ?? robots[0];
  if (!robot) return null;

  const batPct = Math.round(robot.battery);
  const locPct = Math.round(robot.localizationConfidence * 100);
  const visPct = Math.round(robot.perceptionConfidence * 100);

  return (
    <aside className="pointer-events-auto w-64 rounded-lg bg-[#06180f]/90 border border-cyan-500/20 p-3 shadow-lg flex flex-col gap-2 max-h-[calc(100vh-195px)] overflow-y-auto hud-scroll">
      <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-xs shrink-0"
            style={{ backgroundColor: robot.accentColor }}
          />
          <h2 className="font-display text-xs font-bold text-emerald-50 truncate">
            {robot.name}
          </h2>
        </div>
        <button
          onClick={() => setCameraMode('follow')}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-[11px] text-cyan-300 whitespace-nowrap cursor-pointer"
          title="Follow this robot with camera"
        >
          <Crosshair className="w-3 h-3" />
          <span>Follow</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-center bg-[#092014]/90 p-2 rounded border border-emerald-800/50">
        <div>
          <div className="text-[10px] text-emerald-300/65">Battery</div>
          <div className="font-mono-num text-xs font-semibold text-lime-300">{batPct}%</div>
        </div>
        <div>
          <div className="text-[10px] text-emerald-300/65">Yield</div>
          <div className="font-mono-num text-xs font-semibold text-emerald-50">
            {robot.cropsHarvested} crops
          </div>
        </div>
        <div>
          <div className="text-[10px] text-emerald-300/65">Travel</div>
          <div className="font-mono-num text-xs font-semibold text-cyan-300">
            {robot.distanceTraveled.toFixed(0)}m
          </div>
        </div>
      </div>

      {/* Simulated Localization, Perception & RF Comm Telemetry */}
      <div className="grid grid-cols-3 gap-1 text-center bg-[#092014]/70 px-1.5 py-1.5 rounded border border-emerald-800/40 text-[10px]">
        <div>
          <div className="text-emerald-300/60">Sim Loc</div>
          <div className={`font-mono-num font-semibold ${locPct < 65 ? 'text-violet-300' : 'text-emerald-100'}`}>
            {locPct}%
          </div>
        </div>
        <div>
          <div className="text-emerald-300/60">Vision</div>
          <div className={`font-mono-num font-semibold ${visPct < 70 ? 'text-amber-300' : 'text-emerald-100'}`}>
            {visPct}%
          </div>
        </div>
        <div>
          <div className="text-emerald-300/60">RF Link</div>
          <div className={`font-mono-num font-semibold ${robot.commOnline ? 'text-lime-300' : 'text-purple-300'}`}>
            {robot.commOnline ? 'ONLINE' : 'LOST'}
          </div>
        </div>
      </div>

      {/* Current Objective */}
      <div>
        <div className="text-[11px] font-medium text-emerald-300/70">Current Objective</div>
        <div className="mt-0.5 text-xs font-medium text-emerald-50 leading-snug">
          {robot.objective}
        </div>
      </div>

      {/* Decision Explanation */}
      <div className="pt-1.5 border-t border-emerald-800/50">
        <div className="text-[11px] font-medium text-cyan-300/85">Decision Explanation</div>
        <p className="mt-0.5 text-[11px] text-emerald-100/85 leading-relaxed">
          {robot.decisionReason}
        </p>
      </div>

      {/* Nearby Observations */}
      <div className="pt-1.5 border-t border-emerald-800/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-emerald-300/70">
            Nearby Observations
          </span>
          <span className="font-mono-num text-[10px] text-emerald-300/60">
            R={robot.effectiveSensorRadius.toFixed(1)}m
          </span>
        </div>
        {robot.observations.length === 0 ? (
          <p className="mt-1 text-[11px] text-emerald-300/50">No targets in sensor range</p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {robot.observations.map((obs) => (
              <li
                key={`${obs.kind}-${obs.id}`}
                className="flex items-center justify-between gap-2 text-[11px] py-0.5 border-b border-emerald-900/40 last:border-b-0"
              >
                <span className="text-emerald-100 truncate">{obs.label}</span>
                <span className="font-mono-num text-cyan-300/90 shrink-0">
                  {obs.distance.toFixed(1)}m
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
