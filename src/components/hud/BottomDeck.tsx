import { useEffect, useState } from 'react';
import {
  Bug,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Route,
  X,
} from 'lucide-react';
import { SCENARIO_LIST } from '../../simulation/scenarios/scenarioRegistry';
import { CameraMode, ScenarioId, SimEventCategory } from '../../simulation/types';
import { useSimStore } from '../../store/useSimStore';

function categoryBadgeStyle(cat: SimEventCategory): string {
  switch (cat) {
    case 'PERCEPTION':
      return 'text-amber-300';
    case 'DECISION':
      return 'text-lime-300';
    case 'NAVIGATION':
      return 'text-cyan-300';
    case 'COORDINATION':
      return 'text-purple-300';
    case 'ENERGY':
      return 'text-sky-300';
    case 'RECOVERY':
      return 'text-emerald-300';
    default:
      return 'text-rose-300';
  }
}

export function BottomDeck() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const world = useSimStore((s) => s.worldSnapshot);
  const phase = useSimStore((s) => s.phase);
  const scenario = useSimStore((s) => s.scenario);
  const speedMultiplier = useSimStore((s) => s.speedMultiplier);
  const cameraMode = useSimStore((s) => s.cameraMode);
  const showSensors = useSimStore((s) => s.showSensors);
  const showPaths = useSimStore((s) => s.showPaths);
  const debugMode = useSimStore((s) => s.debugMode);
  const inspectedEvent = useSimStore((s) => s.inspectedEvent);

  const startMission = useSimStore((s) => s.startMission);
  const pauseMission = useSimStore((s) => s.pauseMission);
  const resumeMission = useSimStore((s) => s.resumeMission);
  const resetMission = useSimStore((s) => s.resetMission);
  const setScenario = useSimStore((s) => s.setScenario);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setCameraMode = useSimStore((s) => s.setCameraMode);
  const toggleSensors = useSimStore((s) => s.toggleSensors);
  const togglePaths = useSimStore((s) => s.togglePaths);
  const toggleDebug = useSimStore((s) => s.toggleDebug);
  const setInspectedEvent = useSimStore((s) => s.setInspectedEvent);
  const selectRobot = useSimStore((s) => s.selectRobot);

  const samples = world.energyHistory;
  const chartW = 190;
  const chartH = 44;
  const avgPoints = samples
    .map((s, idx) => {
      const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartW : chartW;
      const y = chartH - (Math.max(0, Math.min(100, s.avgBattery)) / 100) * (chartH - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const minPoints = samples
    .map((s, idx) => {
      const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartW : chartW;
      const y = chartH - (Math.max(0, Math.min(100, s.minBattery)) / 100) * (chartH - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const harvestPct = Math.round(
    (world.metrics.cropsHarvested / Math.max(1, world.metrics.viableCrops)) * 100
  );

  return (
    <div className="pointer-events-none flex flex-col items-center w-full relative">
      {/* Click-to-Inspect Event Decision Popover */}
      {inspectedEvent && (
        <div className="pointer-events-auto mb-2 max-w-lg w-full rounded-lg bg-[#06180f]/96 border border-cyan-400/55 p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-emerald-800/60">
            <div className="flex items-center gap-2 text-xs">
              <span className={`font-mono-num font-bold ${categoryBadgeStyle(inspectedEvent.category)}`}>
                [{inspectedEvent.category}]
              </span>
              <span className="font-mono-num text-emerald-300/75">
                {inspectedEvent.time.toFixed(1)}s · {inspectedEvent.source}
              </span>
            </div>
            <button
              onClick={() => setInspectedEvent(null)}
              className="text-emerald-300/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-1.5 text-xs font-semibold text-emerald-50">
            {inspectedEvent.message}
          </div>
          <p className="mt-1 text-[11px] text-cyan-200/90 leading-relaxed">
            Why it occurred: {inspectedEvent.explanation}
          </p>
          {inspectedEvent.details && (
            <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] font-mono-num text-emerald-300/80">
              {Object.entries(inspectedEvent.details).map(([k, v]) => (
                <span key={k}>
                  {k}: <strong className="text-lime-300">{String(v)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapse Toggle Tab */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-t-md bg-[#06180f]/92 border border-b-0 border-cyan-500/25 text-[11px] font-medium text-cyan-300 hover:text-lime-300 transition-colors cursor-pointer"
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'Show Controls & Event Console' : 'Hide Controls'}</span>
      </button>

      {!collapsed && (
        <div className="pointer-events-auto w-full max-w-[1380px] rounded-lg bg-[#06180f]/92 border border-cyan-500/25 shadow-xl p-2.5 flex flex-col gap-2">
          {/* Interactive Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-800/50">
            <div className="flex items-center gap-1.5">
              {phase === 'running' ? (
                <button
                  onClick={pauseMission}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : phase === 'paused' ? (
                <button
                  onClick={resumeMission}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={startMission}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Mission</span>
                </button>
              )}

              <button
                onClick={() => resetMission()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#0c2719] hover:bg-[#113523] border border-emerald-700/60 text-xs font-medium text-emerald-100 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
                <span>Reset</span>
              </button>

              <div className="flex items-center bg-[#091f14] border border-emerald-800/60 rounded p-0.5 ml-1">
                {([1, 2, 4] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeed(spd)}
                    className={`px-2 py-1 rounded text-xs font-mono-num font-semibold transition-colors cursor-pointer ${
                      speedMultiplier === spd
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-emerald-200/80 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#091f14] border border-emerald-800/60 rounded p-0.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400 mx-1.5 shrink-0" />
              {(
                [
                  { id: 'orbit', label: 'Orbit' },
                  { id: 'isometric', label: 'Isometric' },
                  { id: 'follow', label: 'Follow Robot' },
                ] as { id: CameraMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setCameraMode(m.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    cameraMode === m.id
                      ? 'bg-lime-400 text-slate-950 font-semibold'
                      : 'text-emerald-200/80 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSensors}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-medium whitespace-nowrap cursor-pointer ${
                  showSensors
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                    : 'bg-[#091f14] border-emerald-800/60 text-emerald-300/70'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Sensors</span>
              </button>

              <button
                onClick={togglePaths}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-medium whitespace-nowrap cursor-pointer ${
                  showPaths
                    ? 'bg-lime-500/20 border-lime-400/60 text-lime-200'
                    : 'bg-[#091f14] border-emerald-800/60 text-emerald-300/70'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>Paths</span>
              </button>

              <button
                onClick={toggleDebug}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-medium whitespace-nowrap cursor-pointer ${
                  debugMode
                    ? 'bg-amber-500/25 border-amber-400/70 text-amber-200'
                    : 'bg-[#091f14] border-emerald-800/60 text-emerald-300/70'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Debug</span>
              </button>

              <select
                aria-label="Scenario Selection"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as ScenarioId)}
                className="px-2.5 py-1.5 rounded bg-[#091f14] border border-emerald-700/70 text-xs font-medium text-emerald-100 focus:outline-none focus:border-cyan-400 cursor-pointer max-w-52"
              >
                {SCENARIO_LIST.map((sc) => (
                  <option key={sc.id} value={sc.id} className="bg-[#06180f] text-emerald-50">
                    {sc.code} · {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Telemetry Row */}
          <div className="grid grid-cols-12 gap-3 items-stretch">
            {/* Click-to-Inspect Intelligent Event Console */}
            <div className="col-span-12 md:col-span-5 bg-[#091f14]/85 border border-emerald-800/50 rounded p-2 flex flex-col">
              <div className="flex items-center justify-between text-[11px] font-medium text-cyan-300/85 mb-1">
                <span>Intelligent Decision & Event Console (Click event to inspect)</span>
                <span className="font-mono-num text-emerald-300/60">
                  {world.events.length} logs
                </span>
              </div>
              <div className="h-14 overflow-y-auto hud-scroll flex flex-col gap-0.5 text-[11px]">
                {world.events.slice(0, 16).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setInspectedEvent(ev);
                      if (ev.source.startsWith('AS-')) {
                        selectRobot(ev.source);
                      }
                    }}
                    className="flex items-baseline gap-1.5 text-left hover:bg-[#0e2d1d] px-1 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    <span className="font-mono-num text-[10px] text-emerald-400/70 shrink-0">
                      {ev.time.toFixed(1)}s
                    </span>
                    <span
                      className={`font-mono-num text-[10px] font-bold shrink-0 ${categoryBadgeStyle(
                        ev.category
                      )}`}
                    >
                      [{ev.category}]
                    </span>
                    <span className="text-emerald-100/90 truncate">{ev.message}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Small Fleet Energy Chart */}
            <div className="col-span-6 md:col-span-3 bg-[#091f14]/85 border border-emerald-800/50 rounded p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-emerald-200">Fleet Energy (%)</span>
                <span className="font-mono-num text-[10px] text-cyan-300">
                  Avg {Math.round(world.metrics.averageBattery)}% · {world.metrics.energyConsumed.toFixed(0)}u
                </span>
              </div>
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-11 overflow-visible"
                aria-label="Fleet battery chart"
              >
                <line
                  x1="0"
                  y1={chartH - (24 / 100) * (chartH - 6) - 3}
                  x2={chartW}
                  y2={chartH - (24 / 100) * (chartH - 6) - 3}
                  stroke="rgba(245, 158, 11, 0.35)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                {samples.length > 1 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.75"
                      points={avgPoints}
                    />
                    <polyline
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="1.25"
                      strokeOpacity="0.75"
                      points={minPoints}
                    />
                  </>
                )}
              </svg>
            </div>

            {/* Crop Harvesting Progress + Mission Statistics */}
            <div className="col-span-6 md:col-span-4 bg-[#091f14]/85 border border-emerald-800/50 rounded p-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-emerald-200">Crop Harvesting Progress</span>
                  <span className="font-mono-num font-semibold text-lime-300">
                    {world.metrics.cropsHarvested}/{world.metrics.viableCrops} ({harvestPct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-xs bg-emerald-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-lime-400 transition-all duration-150"
                    style={{ width: `${harvestPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 pt-1.5 text-center border-t border-emerald-800/40">
                <div>
                  <div className="text-[10px] text-emerald-300/65">Avoided</div>
                  <div className="font-mono-num text-xs font-semibold text-amber-300">
                    {world.metrics.avoidanceEvents}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-300/65">Stops</div>
                  <div className="font-mono-num text-xs font-semibold text-rose-300">
                    {world.metrics.safetyStops}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-300/65">Replans</div>
                  <div className="font-mono-num text-xs font-semibold text-cyan-300">
                    {world.metrics.routeReplans}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-300/65">Charges</div>
                  <div className="font-mono-num text-xs font-semibold text-sky-300">
                    {world.metrics.chargingEvents}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-300/65">Violations</div>
                  <div className="font-mono-num text-xs font-semibold text-emerald-100">
                    {world.metrics.collisionEvents + world.metrics.safetyViolations}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
