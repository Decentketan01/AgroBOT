import {
  AlertTriangle,
  BatteryCharging,
  Cpu,
  LayoutGrid,
  Play,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  Wheat,
} from 'lucide-react';
import { useSimStore } from '../../store/useSimStore';

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function TopBar() {
  const world = useSimStore((s) => s.worldSnapshot);
  const phase = useSimStore((s) => s.phase);
  const speedMultiplier = useSimStore((s) => s.speedMultiplier);
  const muted = useSimStore((s) => s.muted);
  const injectMenuOpen = useSimStore((s) => s.injectMenuOpen);

  const toggleMuted = useSimStore((s) => s.toggleMuted);
  const startShowcase = useSimStore((s) => s.startShowcase);
  const setArenaOpen = useSimStore((s) => s.setArenaOpen);
  const setInjectMenuOpen = useSimStore((s) => s.setInjectMenuOpen);

  const activeRobots = world.robots.filter((r) => r.state !== 'IDLE').length;
  const deadlineLeft =
    world.deadlineSec !== null ? Math.max(0, world.deadlineSec - world.simTime) : null;

  return (
    <header className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-[#06180f]/92 border border-cyan-500/25 shadow-lg">
      {/* Zone 1: Brand Title */}
      <div className="flex items-center gap-2 shrink-0">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0"
          aria-hidden="true"
        >
          <polygon
            points="12,2 21,7 21,17 12,22 3,17 3,7"
            stroke="#22d3ee"
            strokeWidth="1.75"
            fill="#0a281a"
          />
          <circle cx="12" cy="12" r="3.5" fill="#a3e635" />
          <line x1="12" y1="2" x2="12" y2="8.5" stroke="#22d3ee" strokeWidth="1.4" />
          <line x1="21" y1="17" x2="15" y2="13.5" stroke="#22d3ee" strokeWidth="1.4" />
          <line x1="3" y1="17" x2="9" y2="13.5" stroke="#22d3ee" strokeWidth="1.4" />
        </svg>
        <span className="font-display text-sm md:text-base font-bold tracking-wide text-emerald-50 whitespace-nowrap">
          AgroSwarm 3D
        </span>
      </div>

      {/* Zone 2: Live Swarm Telemetry */}
      <div className="flex items-center gap-3.5 text-xs text-emerald-100/90 overflow-x-auto">
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Timer className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-emerald-300/70">Time</span>
          <span className="font-mono-num font-semibold text-cyan-300">
            {formatTimer(world.metrics.missionDuration)}
          </span>
        </div>

        {deadlineLeft !== null && (
          <>
            <span className="text-emerald-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
              <span className="text-rose-300 font-semibold">Storm</span>
              <span className="font-mono-num font-bold text-rose-400">
                {deadlineLeft.toFixed(1)}s
              </span>
            </div>
          </>
        )}

        <span className="text-emerald-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Wheat className="w-3.5 h-3.5 text-lime-400" />
          <span className="text-emerald-300/70">Harvest</span>
          <span className="font-mono-num font-semibold text-lime-300">
            {world.metrics.cropsHarvested}/{world.metrics.viableCrops}
          </span>
        </div>

        <span className="text-emerald-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-emerald-300/70">Active</span>
          <span className="font-mono-num font-semibold text-emerald-50">
            {activeRobots}/{world.robots.length}
          </span>
        </div>

        <span className="text-emerald-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <BatteryCharging className="w-3.5 h-3.5 text-lime-400" />
          <span className="text-emerald-300/70">Energy</span>
          <span className="font-mono-num font-semibold text-emerald-50">
            {Math.round(world.metrics.averageBattery)}%
          </span>
        </div>

        <span className="text-emerald-700" aria-hidden="true">·</span>

        <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <span className="font-mono-num font-semibold text-cyan-300">{speedMultiplier}x</span>
        </div>
      </div>

      {/* Zone 3: Arena, Live Inject, Showcase & Mute */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setArenaOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#0c2719] hover:bg-[#123825] border border-cyan-500/45 text-cyan-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
          <span>Challenge Arena</span>
        </button>

        <button
          onClick={() => setInjectMenuOpen(!injectMenuOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            injectMenuOpen
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/50 text-amber-200'
          }`}
          title="Inject a real-world challenge into the active simulation"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Inject Challenge</span>
        </button>

        <button
          onClick={startShowcase}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-lime-400 hover:bg-lime-300 text-slate-950 font-display text-xs font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Launch 90-second Swarm Autonomy Showcase"
        >
          {phase === 'running' && world.scenario === 'showcase' ? (
            <Sparkles className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>Showcase</span>
        </button>

        <button
          onClick={toggleMuted}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="p-1.5 rounded border border-emerald-700/60 bg-[#0b2316] text-emerald-200 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors cursor-pointer"
          title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
