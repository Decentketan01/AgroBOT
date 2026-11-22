import { useEffect } from 'react';
import { FarmCanvas } from './components/scene/FarmCanvas';
import { TopBar } from './components/hud/TopBar';
import { LeftRoster } from './components/hud/LeftRoster';
import { RightInspector } from './components/hud/RightInspector';
import { BottomDeck } from './components/hud/BottomDeck';
import { TitleOverlay } from './components/hud/TitleOverlay';
import { MissionResultsModal } from './components/hud/MissionResultsModal';
import { ChallengeArenaModal } from './components/hud/ChallengeArenaModal';
import { ComparisonModal } from './components/hud/ComparisonModal';
import { InjectChallengeMenu } from './components/hud/InjectChallengeMenu';
import { useSimStore } from './store/useSimStore';

export default function App() {
  const activeCue = useSimStore((s) => s.worldSnapshot.activeCue);
  const phase = useSimStore((s) => s.phase);
  const startMission = useSimStore((s) => s.startMission);
  const pauseMission = useSimStore((s) => s.pauseMission);
  const resumeMission = useSimStore((s) => s.resumeMission);
  const selectRobot = useSimStore((s) => s.selectRobot);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'briefing') startMission();
        else if (phase === 'running') pauseMission();
        else if (phase === 'paused') resumeMission();
      } else if (e.code === 'Enter' && phase === 'briefing') {
        startMission();
      } else if (e.key === '1') {
        selectRobot('AS-01');
      } else if (e.key === '2') {
        selectRobot('AS-02');
      } else if (e.key === '3') {
        selectRobot('AS-03');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, startMission, pauseMission, resumeMission, selectRobot]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#07140d]">
      {/* Isolated 3D Viewport Container */}
      <div className="absolute inset-0 z-0">
        <FarmCanvas />
      </div>

      {/* Non-blocking Gaming HUD Perimeter Overlay */}
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 gap-2">
        {/* TOP BAR */}
        <TopBar />

        {/* MIDDLE PERIMETER: Left Roster + Open 3D Farm Center + Right Inspector */}
        <div className="flex-1 flex items-start justify-between gap-3 min-h-0">
          <LeftRoster />

          {/* Showcase Autonomy Story Cue Callout */}
          <div className="flex-1 flex justify-center pt-1">
            {activeCue && phase === 'running' && (
              <div className="max-w-md rounded-lg bg-[#06180f]/94 border border-lime-400/50 px-4 py-2 text-center shadow-lg">
                <div className="font-display text-xs font-bold text-lime-300">
                  {activeCue.title}
                </div>
                <div className="text-[11px] text-emerald-100/90 mt-0.5">
                  {activeCue.subtitle}
                </div>
              </div>
            )}
          </div>

          <RightInspector />
        </div>

        {/* BOTTOM CONTROLS & TELEMETRY DECK */}
        <BottomDeck />
      </div>

      {/* Interactive Challenge Modals & Live Injection Menu */}
      <InjectChallengeMenu />
      <ChallengeArenaModal />
      <ComparisonModal />
      <TitleOverlay />
      <MissionResultsModal />
    </main>
  );
}
