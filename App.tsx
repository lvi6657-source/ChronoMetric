
/* 
   ENGINEERING MANIFEST: ZERO LATENCY
   ----------------------------------
   1. NO CSS TRANSITIONS.
   2. NO ANIMATIONS.
   3. INSTANT STATE UPDATES.
   4. MEMOIZED COMPONENTS FOR 60FPS PERFORMANCE.
   5. STRICT TOUCH HANDLING.
*/

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Activity, Clock, Hash, TrendingUp, Zap, Volume2, VolumeX, Target, X, Check, Delete, Vibrate, VibrateOff, Info, Trophy } from 'lucide-react';
import { formatTimeTenths, formatTimeShort, formatTime, formatSmart } from './utils/format';
import { Round } from './types';
import ChartPanel from './components/ChartPanel';
import ProgressBar from './components/ProgressBar';
import StatsPanel from './components/StatsPanel';
import { getFullVersion } from './version';
import { APP_CONFIG } from './config'; // IMPORT GLOBAL CONFIG
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// --- Helpers ---
// Format static delta value (number) for display
const formatDeltaValue = (diff: number) => {
    if (isNaN(diff)) return "-";
    const absDiff = Math.abs(diff);
    // Use Smart Format logic manually for delta
    const seconds = Math.floor(absDiff / 1000);
    const tenths = Math.floor((absDiff % 1000) / 100);
    
    const sign = diff > 0 ? '+' : (diff < 0 ? '-' : '');
    const colorClass = diff > 0 ? 'text-red-500' : (diff < 0 ? 'text-emerald-500' : 'text-zinc-500');
    
    return (
        <span className={colorClass}>
            {sign}{seconds}.{tenths}
        </span>
    );
};

const formatCpm = (duration: number) => {
    if (duration === 0) return "-";
    return (60000 / duration).toFixed(1);
};

// --- GHOST ZERO TIME RENDERER (Smart) ---
const TimeRenderer = React.memo(({ ms }: { ms: number }) => {
    return <>{formatSmart(ms)}</>;
});

// --- Memoized UI Components (Performance Core) ---

const Header = React.memo(({ 
    isMuted, 
    toggleMute, 
    isVibrationEnabled, 
    toggleVibration, 
    fullVersion, 
    openTargetInput, 
    targetTime, 
    onResetTarget,
    className 
}: any) => {
    
    // Long Press Logic for Takt Button
    const taktTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const isLongPress = useRef(false);

    const handleTaktDown = (e: React.PointerEvent) => {
        // Only accept primary input
        isLongPress.current = false;
        taktTimeoutRef.current = setTimeout(() => {
            isLongPress.current = true;
            if (onResetTarget) onResetTarget();
        }, APP_CONFIG.interaction.longPressDelayMs); // Use Config
    };

    const handleTaktUp = (e: React.PointerEvent) => {
        if (taktTimeoutRef.current) {
            clearTimeout(taktTimeoutRef.current);
        }
        if (!isLongPress.current) {
            openTargetInput();
        }
    };

    const handleTaktLeave = (e: React.PointerEvent) => {
        if (taktTimeoutRef.current) {
            clearTimeout(taktTimeoutRef.current);
        }
    };

    return (
    <header 
        className={`w-full flex justify-between items-center bg-zinc-950 border-b border-zinc-900/50 px-4 select-none z-20 ${className || ''}`}
        style={{ height: APP_CONFIG.layout.headerHeight }} // Use Config Height
    >
        <div 
            className="flex items-baseline gap-2 active:opacity-50 cursor-pointer"
        >
            <div className="flex items-center gap-2">
                <Activity className="text-accent w-4 h-4" />
                <h1 className="text-sm font-bold tracking-wider text-zinc-300">
                    CHRONO<span className="text-accent">METRIC</span>
                </h1>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">{fullVersion}</span>
        </div>
        <div className="flex items-center gap-3">
             {/* Target Button with Long Press */}
             <button 
                onPointerDown={handleTaktDown}
                onPointerUp={handleTaktUp}
                onPointerLeave={handleTaktLeave}
                className={`flex items-center gap-1 text-[10px] font-mono border rounded px-2 py-1 focus:outline-none active:bg-zinc-900 select-none ${targetTime ? 'text-cyan-400 border-cyan-900' : 'text-zinc-500 border-zinc-800'}`}
            >
                <Target className="w-3 h-3" />
                {targetTime ? formatTimeShort(targetTime) : 'TAKT'}
            </button>

            <button 
                onClick={toggleVibration} 
                className={`focus:outline-none p-2 transition-colors ${isVibrationEnabled ? 'text-emerald-500' : 'text-zinc-600'}`}
            >
                {isVibrationEnabled ? <Vibrate className="w-4 h-4" /> : <VibrateOff className="w-4 h-4" />}
            </button>

            <button 
                onClick={toggleMute} 
                className={`focus:outline-none p-2 transition-colors ${!isMuted ? 'text-emerald-500' : 'text-zinc-600'}`}
            >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
        </div>
    </header>
)});

const TimerDisplay = React.memo(({ 
    elapsedLap, 
    freezeSnapshot, 
    startInteraction, 
    stopInteraction, 
    fontClass, 
    mainFontSize,
    className,
    // Stats Logic
    roundsCount,
    statMode,
    averageTime,
    averageCpm,
    bestLap, 
    elapsedTotal,
    targetTime,
    toggleStatMode,
    onToggleView,
    viewMode,
    onToggleFont,
    // Progress Bar Props
    progressReference,
    progressMode
}: any) => {
    const displayTime = freezeSnapshot ? freezeSnapshot.lap : elapsedLap;
    const textColor = freezeSnapshot ? 'text-emerald-500' : 'text-zinc-100';

    // --- Stats Logic ---
    
    // Center Value (Row 2)
    let centerValue: React.ReactNode = "-";
    let centerIcon = <TrendingUp className="w-4 h-4 text-accent" />;
    let centerColor = "text-accent";
    let centerLabel = "AVG";

    if (freezeSnapshot) {
        // FLIP TO DELTA DURING FREEZE
        centerValue = formatDeltaValue(freezeSnapshot.delta);
        centerIcon = <Activity className="w-4 h-4 text-zinc-400" />;
        centerLabel = "DELTA";
        centerColor = ""; 
    } else {
        if (statMode === 'time') {
            centerValue = <TimeRenderer ms={averageTime} />;
            centerIcon = <TrendingUp className="w-4 h-4 text-accent" />;
            centerLabel = "AVG";
        } else if (statMode === 'cpm') {
            centerValue = averageCpm;
            centerIcon = <Zap className="w-4 h-4 text-accent" />;
            centerLabel = "CPM";
        } else if (statMode === 'best') {
            centerValue = bestLap > 0 ? <TimeRenderer ms={bestLap} /> : "-";
            centerIcon = <Trophy className="w-4 h-4 text-amber-400" />;
            centerLabel = "BEST";
            centerColor = "text-amber-400";
        } else if (statMode === 'target') {
            centerValue = targetTime ? <TimeRenderer ms={targetTime} /> : "SET";
            centerIcon = <Target className="w-4 h-4 text-cyan-400" />;
            centerLabel = "TAKT";
            centerColor = "text-cyan-400";
        }
    }

    // Total Value (Row 3)
    const displayTotal = freezeSnapshot ? freezeSnapshot.total : elapsedTotal;
    const totalColor = freezeSnapshot ? 'text-emerald-500' : 'text-zinc-300';

    // View Mode Icon Logic
    let viewIcon = <Clock className={`w-4 h-4 ${totalColor}`} />;
    let viewLabel = "TOTAL";
    
    return (
        <div 
            className={`w-full landscape:h-auto landscape:flex-1 flex relative bg-zinc-950 border-b border-zinc-900/50 select-none overflow-hidden ${className || ''}`}
            style={{ height: APP_CONFIG.layout.timerDisplayHeight }} // Use Config Height
        >
            {/* Touch Zones (Background Layer) */}
            <div 
                className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-w-resize outline-none ring-0 touch-none" 
                onPointerDown={(e) => startInteraction('decrease', e)}
                onPointerUp={() => stopInteraction('decrease')}
                onPointerLeave={() => stopInteraction('decrease')}
            />
            <div 
                className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-e-resize outline-none ring-0 touch-none" 
                onPointerDown={(e) => startInteraction('increase', e)}
                onPointerUp={() => stopInteraction('increase')}
                onPointerLeave={() => stopInteraction('increase')}
            />
            
            {/* Left Side: Current Lap Time */}
            <div 
                className={`h-full flex items-center justify-start pl-4 relative z-0 pointer-events-none`}
                style={{ width: `${APP_CONFIG.layout.timerWidthRatio * 100}%` }} // Use Config Ratio
            >
               <div 
                  className={`${textColor} ${fontClass} font-bold leading-none tracking-tighter tabular-nums`}
                  style={{ fontSize: `${mainFontSize}${APP_CONFIG.typography.timer.unit}` }} // Use Config Unit
               >
                   <TimeRenderer ms={displayTime} />
               </div>
            </div>

            {/* Right Side: Stats Stack */}
            <div 
                className="h-full flex flex-col justify-between pr-4 relative z-30"
                style={{ 
                    width: `${(1 - APP_CONFIG.layout.timerWidthRatio) * 100}%`,
                    paddingTop: '0px',
                    paddingBottom: '42px'
                }}
            >
                {/* Row 1: Rounds Count */}
                <div 
                    className="flex items-center justify-end gap-2 cursor-pointer active:opacity-50 py-0.5"
                    onClick={onToggleFont}
                >
                    <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest hidden sm:inline">Rounds</span>
                    <div className="flex items-center gap-1">
                        <span className={`${fontClass} text-3xl text-zinc-300 leading-none`}>{roundsCount}</span>
                        <Hash className="w-4 h-4 text-zinc-600" />
                    </div>
                </div>

                {/* Row 2: Avg/Delta/Target/Best */}
                <div 
                    className="flex items-center justify-end gap-2 cursor-pointer active:opacity-50 py-0.5"
                    onPointerDown={toggleStatMode}
                >
                     <span className={`text-[10px] font-mono uppercase tracking-widest hidden sm:inline ${centerColor === 'text-accent' ? 'text-amber-900/60' : (centerColor === 'text-cyan-400' ? 'text-cyan-900/60' : (centerColor === 'text-amber-400' ? 'text-amber-900/60' : 'text-zinc-600'))}`}>{centerLabel}</span>
                     <div className="flex items-center gap-1">
                        <span className={`${fontClass} text-3xl leading-none ${centerColor}`}>
                            {centerValue}
                        </span>
                        {centerIcon}
                    </div>
                </div>

                {/* Row 3: Total Time & View Toggle */}
                <div 
                    className="flex items-center justify-end gap-2 cursor-pointer active:opacity-50 py-0.5"
                    onClick={onToggleView}
                >
                    <span className={`text-[10px] font-mono uppercase tracking-widest hidden sm:inline ${freezeSnapshot ? 'text-emerald-900' : 'text-zinc-600'}`}>
                        {viewMode === 'chart' ? 'CHART' : (viewMode === 'list' ? 'LIST' : 'STATS')}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className={`${fontClass} text-3xl leading-none ${totalColor}`}>
                            <TimeRenderer ms={displayTotal} />
                        </span>
                        {/* Dynamically change icon based on viewMode to give hint of current state */}
                         {viewMode === 'stats' ? <Info className={`w-4 h-4 ${totalColor}`} /> : <Clock className={`w-4 h-4 ${totalColor}`} />}
                    </div>
                </div>
            </div>

            {/* Progress Bar Overlay */}
            <ProgressBar elapsed={displayTime} reference={progressReference} mode={progressMode} />
        </div>
    );
});

const ControlButtons = React.memo(({ isRunning, handleStartAction, handleStopAction, handleLapAction, handleResetAction, className }: any) => {
    
    // LOGIC:
    // Left Button: 
    //   - If Running: "FIX" (Lap)
    //   - If Stopped: "START"
    
    // Right Button:
    //   - If Running: "STOP"
    //   - If Stopped: "RESET"

    // Left Handler
    const onLeftDown = (e: React.PointerEvent) => {
        e.preventDefault();
        if (isRunning) {
            handleLapAction(e);
        } else {
            handleStartAction(e);
        }
    };

    // Right Handler
    const onRightDown = (e: React.PointerEvent) => {
        e.preventDefault();
        if (isRunning) {
            handleStopAction(e);
        } else {
            handleResetAction();
        }
    };

    return (
      <div 
        className={`w-full flex bg-zinc-950 z-30 border-t border-zinc-900 select-none ${className || ''}`}
        style={{ height: APP_CONFIG.layout.controlButtonsHeight }} // Use Config Height
      >
        
        {/* LEFT BUTTON: START / FIX */}
        <button
          onPointerDown={onLeftDown}
          className={`flex-1 flex flex-col items-center justify-center border-r border-zinc-900 select-none active:opacity-80 ${
            isRunning 
              ? 'bg-zinc-200 text-zinc-900' // FIX Mode (Neutral)
              : 'bg-emerald-500 text-emerald-950' // START Mode (Green)
          }`}
        >
          <span className="text-lg font-bold tracking-widest uppercase">
             {isRunning ? 'FIX' : 'START'}
          </span>
        </button>

        {/* RIGHT BUTTON: STOP / RESET */}
        <button
          onPointerDown={onRightDown}
          className={`flex-1 flex flex-col items-center justify-center select-none active:opacity-80 ${
             isRunning
                ? 'bg-red-500 text-white' // STOP Mode (Red)
                : 'bg-zinc-900 text-zinc-400' // RESET Mode (Dark)
          }`}
        >
          <span className={`text-lg font-bold tracking-widest uppercase`}>
            {isRunning ? 'STOP' : 'RESET'}
          </span>
        </button>
      </div>
)});

const TargetInput = React.memo(({ isOpen, onClose, onSet, initialValue }: any) => {
    const [value, setValue] = useState("");

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue ? (initialValue / 1000).toFixed(1) : "");
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handlePress = (key: string) => {
        if (key === 'C') {
            setValue("");
        } else if (key === '.') {
            if (!value.includes('.')) setValue(prev => prev + '.');
        } else if (key === 'BS') {
             setValue(prev => prev.slice(0, -1));
        } else {
             if (value.length < 5) setValue(prev => prev + key);
        }
    };

    const handleConfirm = () => {
        const seconds = parseFloat(value);
        if (!isNaN(seconds) && seconds > 0) {
            onSet(Math.round(seconds * 1000));
        } else {
            onSet(null);
        }
        onClose();
    };

    return (
        <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center select-none">
             <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 p-4 shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                     <span className="text-xs text-zinc-500 font-mono uppercase">Set Takt Time (sec)</span>
                     <button onClick={onClose}><X className="text-zinc-500" /></button>
                 </div>
                 <div className="bg-zinc-950 border border-zinc-800 h-16 mb-4 flex items-center justify-end px-4">
                     <span className="text-4xl font-narrow text-cyan-400">{value || "0"}</span>
                 </div>
                 <div className="grid grid-cols-3 gap-2">
                     {[1,2,3,4,5,6,7,8,9].map(n => (
                         <button key={n} onPointerDown={() => handlePress(n.toString())} className="h-14 bg-zinc-800 text-zinc-200 font-mono text-xl active:bg-zinc-700 border border-zinc-900/50">{n}</button>
                     ))}
                     <button onPointerDown={() => handlePress('.')} className="h-14 bg-zinc-800 text-zinc-200 font-mono text-xl active:bg-zinc-700 border border-zinc-900/50">.</button>
                     <button onPointerDown={() => handlePress('0')} className="h-14 bg-zinc-800 text-zinc-200 font-mono text-xl active:bg-zinc-700 border border-zinc-900/50">0</button>
                     <button onPointerDown={() => handlePress('BS')} className="h-14 bg-zinc-800 text-red-400 font-mono text-xl active:bg-zinc-700 border border-zinc-900/50 flex items-center justify-center"><Delete className="w-5 h-5"/></button>
                 </div>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                     <button onPointerDown={() => handlePress('C')} className="h-12 bg-zinc-800 text-zinc-500 font-mono text-sm active:bg-zinc-700 border border-zinc-900/50">CLEAR</button>
                     <button onPointerDown={handleConfirm} className="h-12 bg-cyan-900/30 text-cyan-400 font-mono text-sm active:bg-cyan-900/50 border border-cyan-900/50 flex items-center justify-center gap-2"><Check className="w-4 h-4"/> SET</button>
                 </div>
             </div>
        </div>
    );
});

const LogList = React.memo(({ rounds, averageTime, targetTime, statMode, tableFontSize, logsEndRef, fontClass }: any) => {
    useLayoutEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "auto" });
        }
    }, [rounds, logsEndRef]);

    return (
        <div className="w-full h-full overflow-y-auto pb-2 touch-pan-y">
            <table className={`w-full border-collapse ${fontClass}`}>
                <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-900 shadow-sm text-[10px] text-zinc-500 uppercase font-sans select-none pointer-events-none">
                    <tr>
                        <th className="px-4 py-2 text-left w-[1px] whitespace-nowrap">#</th>
                        <th className="px-2 py-2 text-right">Time</th>
                        <th className="px-2 py-2 text-right">Delta {targetTime ? '(TGT)' : ''}</th>
                        <th className="px-4 py-2 text-right">
                            {statMode === 'time' ? 'Total' : (statMode === 'cpm' ? 'CPM' : (statMode === 'best' ? 'Best' : 'TGT'))}
                        </th>
                    </tr>
                </thead>
                <tbody style={{ fontSize: `${tableFontSize}px` }}>
                    {rounds.map((round: Round, index: number) => {
                        const totalAtRound = rounds.slice(0, index + 1).reduce((a: number, b: Round) => a + b.duration, 0);
                        const currentBest = Math.min(...rounds.slice(0, index + 1).map((r:Round) => r.duration));
                        
                        let lastColVal: React.ReactNode = "";
                        
                        if (statMode === 'time') lastColVal = <TimeRenderer ms={totalAtRound} />;
                        else if (statMode === 'cpm') lastColVal = formatCpm(round.duration);
                        else if (statMode === 'best') lastColVal = <span className="text-amber-400"><TimeRenderer ms={currentBest} /></span>;
                        else lastColVal = targetTime ? <TimeRenderer ms={targetTime} /> : "-";

                        return (
                            <tr key={round.id} className="border-b border-zinc-900/50 leading-none">
                                <td className="px-4 py-1 text-left text-zinc-600 w-[1px] whitespace-nowrap">{round.id}</td>
                                <td className="px-2 py-1 text-right text-zinc-300">
                                    <TimeRenderer ms={round.duration} />
                                </td>
                                <td className="px-2 py-1 text-right font-bold">{formatDeltaValue(round.delta)}</td>
                                <td className={`px-4 py-1 text-right ${statMode === 'cpm' || statMode === 'target' ? 'text-accent' : 'text-zinc-500'}`}>
                                    {lastColVal}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div ref={logsEndRef} />
        </div>
    );
});

const ChartWrapper = React.memo(({ rounds, averageTime, targetTime }: any) => (
    <div className="w-full h-full">
        <ChartPanel rounds={rounds} averageTime={averageTime} targetTime={targetTime} />
    </div>
));

// --- MAIN APPLICATION ---

export default function App() {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedLap, setElapsedLap] = useState(0);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [lapStartTime, setLapStartTime] = useState(0);
  // Updated statMode type to include 'best'
  const [statMode, setStatMode] = useState<'time' | 'cpm' | 'target' | 'best'>('time');
  
  // UPDATED: View Mode can now be 'chart', 'list', or 'stats'
  const [viewMode, setViewMode] = useState<'chart' | 'list' | 'stats'>('chart');
  
  // Font State
  const [fontStyle, setFontStyle] = useState<'mono' | 'rubik' | 'fixed' | 'ibm' | 'chakra' | 'orbitron' | 'quantico' | 'electro' | 'rajdhani' | 'michroma' | 'bruno' | 'audiowide' | 'tektur' | 'wallpoet' | 'syncopate' | 'syne' | 'exo' | 'saira' | 'turret' | 'oxanium'>('mono');
  const [fontSizes, setFontSizes] = useState<Record<string, number>>({});

  const [tableFontSize, setTableFontSize] = useState(APP_CONFIG.typography.list.defaultSize);
  const [statsFontSize, setStatsFontSize] = useState(APP_CONFIG.typography.stats.defaultSize); 
  const [chartWindowSize, setChartWindowSize] = useState<number>(APP_CONFIG.chart.defaultWindowSize);

  const [isMuted, setIsMuted] = useState(false);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [freezeSnapshot, setFreezeSnapshot] = useState<{lap: number, total: number, delta: number} | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [showTargetInput, setShowTargetInput] = useState(false);

  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Interaction Refs
  const interactionIntervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const touchStartTimeRef = useRef<number>(0);
  const activeZones = useRef<{left: boolean, right: boolean}>({ left: false, right: false });

  const fullVersion = getFullVersion();

  const currentMainFontSize = fontSizes[fontStyle] || APP_CONFIG.typography.timer.defaultSize;

  const getFontClass = () => {
      switch (fontStyle) {
          case 'rubik': return 'font-rubik';
          case 'fixed': return 'font-fixed';
          case 'ibm': return 'font-ibm';
          case 'chakra': return 'font-chakra';
          case 'orbitron': return 'font-orbitron';
          case 'quantico': return 'font-quantico';
          case 'electro': return 'font-electro';
          case 'rajdhani': return 'font-rajdhani';
          case 'michroma': return 'font-michroma';
          case 'bruno': return 'font-bruno';
          case 'audiowide': return 'font-audiowide';
          case 'tektur': return 'font-tektur';
          case 'wallpoet': return 'font-wallpoet';
          case 'syncopate': return 'font-syncopate';
          case 'syne': return 'font-syne';
          case 'exo': return 'font-exo';
          case 'saira': return 'font-saira';
          case 'turret': return 'font-turret';
          case 'oxanium': return 'font-oxanium';
          default: return 'font-mono';
      }
  };
  const fontClass = getFontClass();

  // --- Audio Logic ---
  const getAudioContext = useCallback(() => {
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              audioCtxRef.current = new AudioContext();
          }
      }
      if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
  }, []);

  const playTone = useCallback((type: 'positive' | 'negative') => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'positive') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      } else {
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
  }, [isMuted, getAudioContext]);

  const triggerHaptic = useCallback(async (pattern: 'click' | 'success' | 'failure' | 'tick') => {
      if (!isVibrationEnabled) return;
      try {
          switch (pattern) {
              case 'click':
                  await Haptics.impact({ style: ImpactStyle.Medium });
                  break;
              case 'success':
                  await Haptics.notification({ type: 'SUCCESS' as any });
                  break;
              case 'failure':
                  await Haptics.notification({ type: 'ERROR' as any });
                  break;
              case 'tick':
                  await Haptics.impact({ style: ImpactStyle.Light });
                  break;
          }
      } catch (e) {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
              switch (pattern) {
                  case 'click': navigator.vibrate(15); break;
                  case 'success': navigator.vibrate([10, 30, 10]); break;
                  case 'failure': navigator.vibrate(50); break;
                  case 'tick': navigator.vibrate(5); break;
              }
          }
      }
  }, [isVibrationEnabled]);

  const handleResetTarget = useCallback(() => {
      if (targetTime !== null) {
          setTargetTime(null);
          triggerHaptic('success');
      }
  }, [targetTime, triggerHaptic]);

  // --- Timer Logic ---
  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const now = Date.now();
      setElapsedLap(now - lapStartTime);
      setElapsedTotal(now - startTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [lapStartTime, startTime]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning, animate]);

  // --- Handlers ---

  const handleStart = useCallback((e: React.PointerEvent) => {
      e.preventDefault();
      triggerHaptic('click');
      
      const now = Date.now();
      if (elapsedTotal === 0) {
          setStartTime(now);
          setLapStartTime(now);
      } else {
          setStartTime(now - elapsedTotal);
          setLapStartTime(now - elapsedLap);
      }
      setIsRunning(true);
      getAudioContext();
  }, [elapsedTotal, elapsedLap, getAudioContext, triggerHaptic]);

  const handleStop = useCallback((e: React.PointerEvent) => {
      e.preventDefault();
      triggerHaptic('click');
      setIsRunning(false);
  }, [triggerHaptic]);

  const handleLap = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (!isRunning) return;

    const now = Date.now();
    const duration = now - lapStartTime;
    const currentTotal = now - startTime;

    const currentRoundsCount = rounds.length;
    const previousTotalDuration = rounds.reduce((acc, r) => acc + r.duration, 0);
    const newTotalDuration = previousTotalDuration + duration;
    const newCount = currentRoundsCount + 1;
    const currentAverage = newTotalDuration / newCount;

    const referenceValue = targetTime && targetTime > 0 ? targetTime : currentAverage;
    const delta = duration - referenceValue;

    setFreezeSnapshot({ lap: duration, total: currentTotal, delta: delta });
    
    setTimeout(() => {
        setFreezeSnapshot(null);
    }, APP_CONFIG.interaction.snapshotFreezeTimeMs);

    if (rounds.length > 0 || targetTime) {
        if (delta <= 0) {
            playTone('positive');
            triggerHaptic('success');
        } else {
            playTone('negative');
            triggerHaptic('failure');
        }
    } else {
        triggerHaptic('click');
    }

    const newRound: Round = {
      id: rounds.length + 1,
      duration: duration,
      timestamp: now,
      delta: delta 
    };

    setRounds(prev => [...prev, newRound]);
    setLapStartTime(now);
    setElapsedLap(0);

  }, [isRunning, lapStartTime, startTime, rounds, playTone, targetTime, triggerHaptic]);

  const handleReset = useCallback(() => {
    triggerHaptic('click');
    setIsRunning(false);
    setElapsedLap(0);
    setElapsedTotal(0);
    setRounds([]);
    setStartTime(0);
    setLapStartTime(0);
    setFreezeSnapshot(null);
    setChartWindowSize(0);
    cancelAnimationFrame(requestRef.current);
  }, [triggerHaptic]);

  const toggleStatMode = useCallback(() => {
    triggerHaptic('tick');
    setStatMode(prev => {
        if (prev === 'time') return 'cpm';
        if (prev === 'cpm') return 'best'; // Added BEST
        if (prev === 'best') return 'target'; // Added BEST logic
        return 'time';
    });
  }, [triggerHaptic]);

  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);
  const toggleVibration = useCallback(() => {
      triggerHaptic('click');
      setIsVibrationEnabled(prev => !prev);
  }, [triggerHaptic]);

  const toggleViewMode = useCallback(() => {
      triggerHaptic('click');
      // CYCLE: CHART -> LIST -> STATS -> CHART
      setViewMode(prev => {
          if (prev === 'chart') return 'list';
          if (prev === 'list') return 'stats';
          return 'chart';
      });
  }, [triggerHaptic]);

  const toggleFont = useCallback(() => {
      triggerHaptic('click');
      setFontStyle(prev => {
          // Standard cycle with new fonts
          if (prev === 'mono') return 'rubik';
          if (prev === 'rubik') return 'fixed';
          if (prev === 'fixed') return 'ibm';
          if (prev === 'ibm') return 'chakra';
          if (prev === 'chakra') return 'orbitron';
          if (prev === 'orbitron') return 'quantico';
          if (prev === 'quantico') return 'electro';
          if (prev === 'electro') return 'rajdhani';
          if (prev === 'rajdhani') return 'michroma';
          if (prev === 'michroma') return 'bruno';
          if (prev === 'bruno') return 'audiowide';
          if (prev === 'audiowide') return 'tektur';
          if (prev === 'tektur') return 'wallpoet';
          if (prev === 'wallpoet') return 'syncopate';
          if (prev === 'syncopate') return 'syne';
          // New fonts
          if (prev === 'syne') return 'exo';
          if (prev === 'exo') return 'saira';
          if (prev === 'saira') return 'turret';
          if (prev === 'turret') return 'oxanium';
          
          return 'mono';
      });
  }, [triggerHaptic]);

  const adjustMainFontSize = useCallback((direction: 'increase' | 'decrease') => {
      setFontSizes(prev => {
          const current = prev[fontStyle] || APP_CONFIG.typography.timer.defaultSize; 
          let next = current;
          const { minSize, maxSize, step } = APP_CONFIG.typography.timer;
          
          if (direction === 'increase') next = Math.min(current + step, maxSize);
          if (direction === 'decrease') next = Math.max(current - step, minSize);
          
          if (next !== current) triggerHaptic('tick');
          
          return {
              ...prev,
              [fontStyle]: next
          };
      });
  }, [fontStyle, triggerHaptic]);

  const adjustDisplayView = useCallback((direction: 'increase' | 'decrease') => {
      if (viewMode === 'list') {
          const { maxSizeDivisor, maxSizeOffset, minSize } = APP_CONFIG.typography.list;
          const maxFont = (window.innerWidth / maxSizeDivisor) + maxSizeOffset; 
          setTableFontSize(prev => {
              let nextVal = prev;
              if (direction === 'increase') nextVal = Math.min(prev + 1, maxFont);
              if (direction === 'decrease') nextVal = Math.max(prev - 1, minSize);
              if (nextVal !== prev) triggerHaptic('tick');
              return nextVal;
          });
      } else if (viewMode === 'chart') {
          setChartWindowSize(prev => {
              const totalRounds = rounds.length > 0 ? rounds.length : 100; 
              let currentSize = prev === 0 ? totalRounds : prev;
              let nextSize = currentSize;
              
              const { minWindowSize } = APP_CONFIG.chart;

              if (direction === 'increase') {
                  nextSize = Math.max(minWindowSize, currentSize - 1); 
              } else {
                  nextSize = currentSize + 1; 
                  if (nextSize >= totalRounds) return 0;
              }

              if (nextSize !== prev) triggerHaptic('tick');
              return nextSize;
          });
      } else if (viewMode === 'stats') {
          setStatsFontSize(prev => {
              let nextVal = prev;
              const { minSize, maxSize, step } = APP_CONFIG.typography.stats;
              
              if (direction === 'increase') nextVal = Math.min(prev + step, maxSize);
              if (direction === 'decrease') nextVal = Math.max(prev - step, minSize);
              if (nextVal !== prev) triggerHaptic('tick');
              return nextVal;
          });
      }
  }, [triggerHaptic, viewMode, rounds.length]);

  const startInteraction = useCallback((direction: 'increase' | 'decrease', e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (direction === 'decrease') activeZones.current.left = true;
      if (direction === 'increase') activeZones.current.right = true;
      touchStartTimeRef.current = Date.now();

      if (activeZones.current.left && activeZones.current.right) {
          if (interactionIntervalRef.current) {
              clearInterval(interactionIntervalRef.current);
              interactionIntervalRef.current = null;
          }
          if (interactionTimeoutRef.current) {
              clearTimeout(interactionTimeoutRef.current);
              interactionTimeoutRef.current = null;
          }
          setChartWindowSize(0);
          triggerHaptic('success');
          return;
      }

      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      if (interactionIntervalRef.current) clearInterval(interactionIntervalRef.current);

      const { gestureStartDelayMs, gestureIntervalMs } = APP_CONFIG.interaction;

      interactionTimeoutRef.current = setTimeout(() => {
          interactionIntervalRef.current = setInterval(() => {
             adjustDisplayView(direction);
          }, gestureIntervalMs); 
      }, gestureStartDelayMs);

  }, [adjustDisplayView, triggerHaptic]);

  const stopInteraction = useCallback((direction: 'increase' | 'decrease') => {
      if (direction === 'decrease') activeZones.current.left = false;
      if (direction === 'increase') activeZones.current.right = false;

      const duration = Date.now() - touchStartTimeRef.current;
      const { gestureStartDelayMs } = APP_CONFIG.interaction;

      if (duration < gestureStartDelayMs && !interactionIntervalRef.current) {
          if (interactionTimeoutRef.current) {
              clearTimeout(interactionTimeoutRef.current);
              interactionTimeoutRef.current = null;
          }
          adjustMainFontSize(direction);
      } else {
          if (interactionIntervalRef.current) {
              clearInterval(interactionIntervalRef.current);
              interactionIntervalRef.current = null;
          }
      }
  }, [adjustMainFontSize]);

  const roundsCount = rounds.length;
  const totalRoundDuration = rounds.reduce((acc, r) => acc + r.duration, 0);
  const averageTime = roundsCount > 0 ? totalRoundDuration / roundsCount : 0;
  const averageCpm = averageTime > 0 ? (60000 / averageTime).toFixed(1) : "0.0";
  const bestLap = roundsCount > 0 ? Math.min(...rounds.map(r => r.duration)) : 0;

  const visibleRounds = React.useMemo(() => {
      if (chartWindowSize === 0) return rounds;
      return rounds.slice(-chartWindowSize);
  }, [rounds, chartWindowSize]);

  const progressMode = targetTime ? 'target' : (rounds.length > 0 ? 'average' : 'hidden');
  const progressReference = targetTime || averageTime;

  // Render Content based on View Mode
  let mainContent;
  if (viewMode === 'chart') {
      mainContent = <ChartWrapper rounds={visibleRounds} averageTime={averageTime} targetTime={targetTime} />;
  } else if (viewMode === 'list') {
      mainContent = (
        <LogList 
            rounds={rounds} 
            averageTime={averageTime}
            targetTime={targetTime} 
            statMode={statMode} 
            tableFontSize={tableFontSize} 
            logsEndRef={logsEndRef} 
            fontClass={fontClass}
        />
      );
  } else {
      mainContent = (
          <StatsPanel 
            rounds={rounds} 
            averageTime={averageTime}
            elapsedTotal={elapsedTotal} 
            roundsCount={roundsCount}
            averageCpm={averageCpm}
            fontClass={fontClass}
            fontSize={statsFontSize}
          />
      );
  }

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-zinc-200 overflow-hidden flex flex-col landscape:grid landscape:grid-cols-[1fr_30%] relative">
      
      <TargetInput 
          isOpen={showTargetInput} 
          onClose={() => setShowTargetInput(false)} 
          onSet={setTargetTime}
          initialValue={targetTime}
      />

      <div className="flex flex-col landscape:h-full landscape:border-l landscape:border-zinc-900 landscape:order-2 landscape:col-start-2 z-20 bg-zinc-950 relative flex-none">
        
        <Header 
            isMuted={isMuted} 
            toggleMute={toggleMute}
            isVibrationEnabled={isVibrationEnabled}
            toggleVibration={toggleVibration}
            fullVersion={fullVersion}
            openTargetInput={() => setShowTargetInput(true)}
            targetTime={targetTime}
            onResetTarget={handleResetTarget}
        />

        <TimerDisplay 
            elapsedLap={elapsedLap} 
            freezeSnapshot={freezeSnapshot}
            startInteraction={startInteraction}
            stopInteraction={stopInteraction}
            fontClass={fontClass}
            mainFontSize={currentMainFontSize}
            roundsCount={roundsCount} 
            statMode={statMode} 
            averageTime={averageTime} 
            averageCpm={averageCpm} 
            bestLap={bestLap}
            elapsedTotal={elapsedTotal}
            targetTime={targetTime}
            toggleStatMode={toggleStatMode}
            onToggleView={toggleViewMode}
            viewMode={viewMode}
            onToggleFont={toggleFont}
            progressReference={progressReference}
            progressMode={progressMode}
        />

        <div className="hidden landscape:block landscape:flex-1 bg-zinc-950" />

        <div className="hidden landscape:block">
             <ControlButtons 
                isRunning={isRunning} 
                handleStartAction={handleStart}
                handleStopAction={handleStop}
                handleLapAction={handleLap}
                handleResetAction={handleReset}
                className=""
            />
        </div>
      </div>

      <div className="flex-1 relative w-full h-full bg-zinc-950 landscape:order-1 landscape:col-start-1 touch-none select-none z-10">
        <div className="absolute inset-0 overflow-hidden">
             {mainContent}
        </div>
      </div>

      <div className="flex-none landscape:hidden z-30 relative">
          <ControlButtons 
                isRunning={isRunning} 
                handleStartAction={handleStart}
                handleStopAction={handleStop}
                handleLapAction={handleLap}
                handleResetAction={handleReset}
                className=""
            />
      </div>

    </div>
  );
}
