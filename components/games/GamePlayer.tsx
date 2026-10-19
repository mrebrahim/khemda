"use client";

import { useState } from "react";
import { completeGame } from "@/app/hero/actions";
import { playPoint } from "@/lib/sound";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import MissionTimer from "@/components/MissionTimer";
import type { GameDef } from "@/lib/games";
import type { Puzzle } from "@/lib/games/build";
import Memory from "@/components/games/Memory";
import Scramble from "@/components/games/Scramble";
import Maze from "@/components/games/Maze";
import Spot from "@/components/games/Spot";
import Shadow from "@/components/games/Shadow";
import Quickfire from "@/components/games/Quickfire";
import SecretBox from "@/components/games/SecretBox";

type Phase = "play" | "sending" | "won";

export default function GamePlayer({
  def,
  puzzle,
  done,
  xp,
  locked,
  lockReason,
  seconds,
  timerLabel,
  tomorrow,
}: {
  def: GameDef;
  puzzle: Puzzle;
  done: boolean;
  xp: number;
  locked: boolean;
  lockReason: string;
  seconds: number;
  timerLabel: string;
  tomorrow: { title: string; emoji: string };
}) {
  const [phase, setPhase] = useState<Phase>(done ? "won" : "play");
  const [error, setError] = useState<string | null>(null);
  const [gained, setGained] = useState(0);
  const [levelUp, setLevelUp] = useState<{
    level: number;
    rankName: string;
    reward: string | null;
  } | null>(null);

  async function win(answers: string[]) {
    if (phase !== "play") return;
    setPhase("sending");
    setError(null);
    try {
      const res = await completeGame(answers);
      if (!res.ok) {
        setError(res.error);
        setPhase("play");
        return;
      }
      setGained(res.xp);
      setPhase("won");
      if (res.leveledUp) {
        setLevelUp({ level: res.level, rankName: res.rankName, reward: res.reward });
      } else {
        playPoint();
      }
    } catch {
      setError("حصلت مشكلة، جرّب تاني");
      setPhase("play");
    }
  }

  if (locked) {
    return (
      <div className="b-frame p-6 text-center">
        <p className="text-5xl mb-3 grayscale opacity-70">🔒</p>
        <p className="font-bold text-white">{def.title} لسه مقفول</p>
        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{lockReason}</p>
        <div className="mt-4 flex justify-center">
          <MissionTimer seconds={seconds} label={timerLabel} tone="slate" />
        </div>
      </div>
    );
  }

  if (phase === "won") {
    return (
      <>
        {levelUp && (
          <LevelUpOverlay
            level={levelUp.level}
            rankName={levelUp.rankName}
            reward={levelUp.reward}
            onClose={() => setLevelUp(null)}
          />
        )}
        <div className="b-frame p-6 text-center" style={{ borderColor: "rgba(34,197,94,.6)" }}>
          <p className="text-5xl mb-3">🎉</p>
          <p className="font-bold text-emerald-400 text-lg">كسبت تحدي النهارده!</p>
          {gained > 0 && (
            <p className="text-3xl font-bold text-amber-400 mt-2 tabular-nums" dir="ltr">
              +{gained}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-3">
            بكرة في انتظارك: <span className="text-white font-bold">{tomorrow.emoji} {tomorrow.title}</span>
          </p>
          <div className="mt-4 flex justify-center">
            <MissionTimer seconds={seconds} label="تحدي بكرة بعد" tone="green" />
          </div>
        </div>
      </>
    );
  }

  const busy = phase === "sending";

  return (
    <div className={`b-frame p-4 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
      <div className="text-center mb-4">
        <p className="text-3xl mb-1">{def.emoji}</p>
        <h2 className="font-bold text-white">{def.title}</h2>
        <p className="text-xs text-slate-400 mt-1">{def.howTo}</p>
      </div>

      {puzzle.kind === "memory" && <Memory puzzle={puzzle} onWin={win} />}
      {puzzle.kind === "scramble" && <Scramble puzzle={puzzle} onWin={win} error={error} />}
      {puzzle.kind === "maze" && <Maze puzzle={puzzle} onWin={win} />}
      {puzzle.kind === "spot" && <Spot puzzle={puzzle} onWin={win} />}
      {puzzle.kind === "shadow" && <Shadow puzzle={puzzle} onWin={win} error={error} />}
      {puzzle.kind === "quickfire" && <Quickfire puzzle={puzzle} onWin={win} error={error} />}
      {puzzle.kind === "box" && <SecretBox puzzle={puzzle} onWin={win} error={error} />}

      <div className="mt-4 flex items-center justify-between gap-2">
        <MissionTimer seconds={seconds} label={timerLabel} tone="amber" />
        <span className="text-xs font-bold text-amber-400 border border-amber-500/40 bg-amber-500/10 px-2 py-1">
          مكسبها +{xp}
        </span>
      </div>

      {/* الألعاب اللي مالهاش زرار تأكيد بتعرض الخطأ هنا */}
      {error &&
        puzzle.kind !== "scramble" &&
        puzzle.kind !== "shadow" &&
        puzzle.kind !== "quickfire" &&
        puzzle.kind !== "box" && (
          <p className="mt-3 text-center text-sm font-bold text-red-300">{error}</p>
        )}
    </div>
  );
}
