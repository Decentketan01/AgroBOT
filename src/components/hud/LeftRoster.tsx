import { useSimStore } from '../../store/useSimStore';
import { RobotFSMState } from '../../simulation/types';

function getStateColor(state: RobotFSMState): string {
  switch (state) {
    case 'HARVESTING':
      return 'text-lime-300';
    case 'SAFETY_STOP':
      return 'text-rose-400';
    case 'RELOCALIZING':
      return 'text-violet-300';
    case 'AVOIDING':
    case 'RECOVERING':
      return 'text-amber-300';
    case 'CHARGING':
    case 'RETURNING':
      return 'text-sky-300';
    case 'MOVING':
    case 'EXPLORING':
      return 'text-cyan-300';
    default:
      return 'text-emerald-300/70';
  }
}

export function LeftRoster() {
  const robots = useSimStore((s) => s.worldSnapshot.robots);
  const selectedRobotId = useSimStore((s) => s.selectedRobotId);
  const selectRobot = useSimStore((s) => s.selectRobot);

  return (
    <aside className="pointer-events-auto w-56 rounded-lg bg-[#06180f]/88 border border-cyan-500/20 p-3 shadow-lg flex flex-col gap-2.5">
      <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5">
        <h2 className="font-display text-xs font-semibold tracking-wider text-cyan-300 uppercase">
          Fleet Roster
        </h2>
        <span className="font-mono-num text-[11px] text-emerald-300/75">
          {robots.length} Units
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {robots.map((robot) => {
          const isSelected = robot.id === selectedRobotId;
          const batPct = Math.round(robot.battery);
          const batColor =
            batPct > 45 ? 'bg-lime-400' : batPct > 24 ? 'bg-amber-400' : 'bg-red-500';

          return (
            <button
              key={robot.id}
              onClick={() => selectRobot(robot.id)}
              className={`text-left p-2 rounded border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#0d2d1d] border-cyan-400/70'
                  : 'bg-[#092014]/80 border-emerald-800/50 hover:border-emerald-600/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-xs shrink-0"
                    style={{ backgroundColor: robot.accentColor }}
                  />
                  <span className="font-display text-xs font-bold text-emerald-50 truncate">
                    {robot.id}
                  </span>
                </div>
                <span className={`font-mono-num text-[11px] font-semibold ${getStateColor(robot.state)}`}>
                  {robot.state}
                </span>
              </div>

              {/* Battery Bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-xs bg-emerald-950 overflow-hidden">
                  <div
                    className={`h-full ${batColor}`}
                    style={{ width: `${Math.max(4, batPct)}%` }}
                  />
                </div>
                <span className="font-mono-num text-[11px] text-emerald-200 w-8 text-right">
                  {batPct}%
                </span>
              </div>

              {/* Assigned Task */}
              <p className="mt-1 text-[11px] text-emerald-200/75 truncate">
                {robot.objective}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
