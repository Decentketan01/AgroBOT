import {
  AlertTriangle,
  BatteryWarning,
  CloudFog,
  Construction,
  Droplets,
  RadioTower,
  Tractor,
  UserCheck,
  X,
} from 'lucide-react';
import { DisturbanceType } from '../../simulation/scenarios/scenarioTypes';
import { useSimStore } from '../../store/useSimStore';

const LIVE_CHALLENGES: {
  type: DisturbanceType;
  label: string;
  detail: string;
  icon: typeof Tractor;
  tone: string;
}[] = [
  {
    type: 'tractor_crossing',
    label: 'Tractor Crossing',
    detail: 'Route heavy tractor across active harvest lane',
    icon: Tractor,
    tone: 'text-amber-300',
  },
  {
    type: 'human_crossing',
    label: 'Human Crossing',
    detail: 'Spawn worker with 3.8m safety stop zone',
    icon: UserCheck,
    tone: 'text-rose-300',
  },
  {
    type: 'blocked_row',
    label: 'Blocked Crop Row',
    detail: 'Drop crates/pipes onto robot corridor (18s)',
    icon: Construction,
    tone: 'text-orange-300',
  },
  {
    type: 'dust_cloud',
    label: 'Dust Event',
    detail: 'Shrink LiDAR range & perception confidence',
    icon: CloudFog,
    tone: 'text-yellow-300',
  },
  {
    type: 'mud_patch',
    label: 'Mud Patch',
    detail: 'Add high-drag mud zone with 2.8x A* cost',
    icon: Droplets,
    tone: 'text-sky-300',
  },
  {
    type: 'charger_failure',
    label: 'Charger Failure',
    detail: 'Fault Solar Dock Alpha offline mid-mission',
    icon: BatteryWarning,
    tone: 'text-red-300',
  },
  {
    type: 'comm_blackspot',
    label: 'Communication Failure',
    detail: 'Create 20s RF black spot & lease autonomy',
    icon: RadioTower,
    tone: 'text-purple-300',
  },
];

export function InjectChallengeMenu() {
  const open = useSimStore((s) => s.injectMenuOpen);
  const setOpen = useSimStore((s) => s.setInjectMenuOpen);
  const injectChallenge = useSimStore((s) => s.injectChallenge);

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute top-14 right-4 z-30 w-72 rounded-lg bg-[#06180f]/96 border border-amber-400/45 shadow-2xl p-3">
      <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-300" />
          <h3 className="font-display text-xs font-bold text-amber-200 uppercase tracking-wide">
            Inject Live Challenge
          </h3>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close Inject Challenge menu"
          className="text-emerald-300/70 hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="mt-1.5 text-[11px] text-emerald-200/75 leading-snug">
        Disruptions alter the live world immediately; robots detect & react autonomously.
      </p>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {LIVE_CHALLENGES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              onClick={() => injectChallenge(item.type)}
              className="flex items-start gap-2.5 text-left p-2 rounded bg-[#092014] hover:bg-[#0e301e] border border-emerald-800/60 hover:border-amber-400/50 transition-colors cursor-pointer"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${item.tone}`} />
              <div className="min-w-0">
                <div className="font-display text-xs font-bold text-emerald-50">
                  {item.label}
                </div>
                <div className="text-[10px] text-emerald-200/70 leading-tight">
                  {item.detail}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
