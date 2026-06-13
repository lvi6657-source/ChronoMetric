
import React, { useMemo, useState } from 'react';
import { Round } from '../types';
import { formatSmart, formatTimeShort, formatTime } from '../utils/format';
import { Trophy, AlertTriangle, Activity, Zap, Target, Gauge, MoveHorizontal, Info, Hash, Clock, ChevronDown, ChevronUp, Percent, Hourglass, TrendingUp } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface StatsPanelProps {
  rounds: Round[];
  averageTime: number;
  elapsedTotal: number;
  roundsCount: number;
  averageCpm: string;
  fontClass?: string;
  fontSize?: number;
}

const StatCell = ({ label, value, subValue, icon: Icon, colorClass, fullWidth = false, fontClass, fontSize, compact = false }: any) => (
  <div className={`relative flex flex-col justify-center px-4 py-2 bg-zinc-950 border-b border-r border-zinc-900/50 ${fullWidth ? 'col-span-2' : 'col-span-1'}`}>
    <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-600 font-mono font-bold">{label}</span>
        {Icon && <Icon className={`w-3 h-3 opacity-40 ${colorClass}`} />}
    </div>
    <div 
        className={`font-bold tracking-tighter leading-none ${colorClass} ${fontClass}`}
        style={{ fontSize: `${Math.max(APP_CONFIG.typography.stats.minSize, fontSize * APP_CONFIG.typography.stats.cellScaleFactor)}px` }} 
    >
      {value}
    </div>
    {subValue && (
      <div className="text-[9px] font-mono text-zinc-700 mt-0.5 truncate">
        {subValue}
      </div>
    )}
  </div>
);

const MetricDescription = ({ icon: Icon, color, title, description, formula, isSelected, onClick }: any) => (
    <div 
        className={`flex flex-col border-b border-zinc-900/50 bg-zinc-950/50 cursor-pointer active:bg-zinc-900/80 transition-colors ${isSelected ? 'bg-zinc-900/80' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-start gap-3 p-3">
            <div className={`mt-0.5 p-1 rounded bg-zinc-900 ${color}`}>
                <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{title}</h4>
                    {isSelected && <div className="text-[8px] text-zinc-600 font-mono">CALCULATION</div>}
                </div>
                {!isSelected && <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{description}</p>}
            </div>
        </div>
        
        {isSelected && (
            <div className="px-3 pb-3 pt-0 pl-11">
                <p className="text-[10px] text-zinc-400 mb-2">{description}</p>
                <div className="bg-zinc-950 border border-zinc-800 p-2 rounded text-[10px] font-mono text-zinc-300">
                    <span className="text-zinc-600">// Formula</span><br/>
                    {formula}
                </div>
            </div>
        )}
    </div>
);

const StatsPanel = React.memo(({ rounds, averageTime, elapsedTotal, roundsCount, averageCpm, fontClass, fontSize = 36 }: StatsPanelProps) => {
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (rounds.length === 0) return null;

    const durations = rounds.map(r => r.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const minRound = rounds.find(r => r.duration === min);
    const maxRound = rounds.find(r => r.duration === max);
    
    // Range
    const range = max - min;

    // Avg Deviation
    const absDiffs = durations.map(v => Math.abs(v - averageTime));
    const avgDelta = absDiffs.reduce((a, b) => a + b, 0) / durations.length;

    // Stability Score (0-100%). 
    const squareDiffs = durations.map(value => Math.pow(value - averageTime, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    const cv = stdDev / averageTime;
    const stabilityRaw = (1 - cv) * 100;
    const stability = Math.max(0, Math.min(100, stabilityRaw)).toFixed(0);

    // Hourly Rate Projection
    const hourlyRate = averageTime > 0 ? (3600000 / averageTime).toFixed(0) : "0";

    // Efficiency (Best vs Average)
    // How close is the average to the peak performance?
    const efficiency = averageTime > 0 ? ((min / averageTime) * 100).toFixed(0) : "0";

    // Time Loss (Total Accumulated Gap from Ideal)
    // If every round was the Best Lap, how much time would we have saved?
    const idealTotal = min * rounds.length;
    const timeLoss = elapsedTotal - idealTotal; // NOTE: elapsedTotal here might be the running total, usually sum of durations is better for stats
    const sumDurations = durations.reduce((a,b) => a+b, 0);
    const actualTimeLoss = sumDurations - idealTotal;

    return {
      min,
      max,
      minId: minRound?.id,
      maxId: maxRound?.id,
      range,
      stability,
      avgDelta,
      hourlyRate,
      efficiency,
      timeLoss: actualTimeLoss
    };
  }, [rounds, averageTime, elapsedTotal]);

  const toggleMetric = (key: string) => {
      setSelectedMetric(prev => prev === key ? null : key);
  };

  // Render Empty State if no data
  if (!stats) {
     return (
         <div className="w-full h-full bg-zinc-900 overflow-y-auto touch-pan-y">
             <div className="grid grid-cols-2 bg-zinc-900">
                 <StatCell label="Total Time" value={formatTime(elapsedTotal)} icon={Clock} colorClass="text-zinc-400" fontClass={fontClass} fontSize={fontSize} />
                 <StatCell label="Avg Time" value="-" icon={TrendingUp} colorClass="text-zinc-400" fontClass={fontClass} fontSize={fontSize} />
             </div>
             <div className="p-8 text-center text-zinc-700 font-mono text-xs uppercase tracking-widest">
                 Awaiting Data<br/>Complete 1 round
             </div>
         </div>
     );
  }

  return (
    <div className="w-full h-full bg-zinc-900 overflow-y-auto touch-pan-y pb-24">
      {/* Compact Grid Layout */}
      <div className="grid grid-cols-2 bg-zinc-900 border-b border-zinc-900/50">
        
        {/* Row 1: Total & Average (As requested) */}
        <StatCell 
            label="Total Time" 
            value={formatTime(elapsedTotal)} 
            icon={Clock} 
            colorClass="text-zinc-200" 
            fontClass={fontClass} 
            fontSize={fontSize} 
        />
        <StatCell 
            label="Average" 
            value={<>{formatSmart(averageTime)}<span className="text-[0.5em] ml-1 text-zinc-600">ms</span></>}
            subValue="ARITHMETIC MEAN"
            icon={TrendingUp} 
            colorClass="text-accent" 
            fontClass={fontClass} 
            fontSize={fontSize} 
        />
        
        {/* Row 2: Rounds & CPM */}
        <StatCell 
            label="Rounds" 
            value={roundsCount} 
            icon={Hash} 
            colorClass="text-zinc-300" 
            fontClass={fontClass} 
            fontSize={fontSize} 
        />
        <StatCell 
            label="Avg CPM" 
            value={averageCpm} 
            subValue="CYCLES / MIN"
            icon={Zap} 
            colorClass="text-zinc-300" 
            fontClass={fontClass} 
            fontSize={fontSize} 
        />

        {/* Row 3: Best & Stability */}
        <StatCell 
          label="Best Lap" 
          value={formatSmart(stats.min)} 
          subValue={`LAP ${stats.minId}`} 
          icon={Trophy}
          colorClass="text-amber-400"
          fontClass={fontClass}
          fontSize={fontSize}
        />
        <StatCell 
          label="Stability" 
          value={`${stats.stability}%`} 
          subValue="CONSISTENCY" 
          icon={Activity}
          colorClass={parseInt(stats.stability) > 90 ? "text-emerald-500" : parseInt(stats.stability) > 75 ? "text-zinc-300" : "text-red-400"}
          fontClass={fontClass}
          fontSize={fontSize}
        />

        {/* Row 4: Efficiency & Loss (High Value Metrics) */}
         <StatCell 
          label="Efficiency" 
          value={`${stats.efficiency}%`} 
          subValue="VS PEAK" 
          icon={Percent}
          colorClass={parseInt(stats.efficiency) > 95 ? "text-emerald-500" : "text-zinc-300"}
          fontClass={fontClass}
          fontSize={fontSize}
        />
        <StatCell 
          label="Time Loss" 
          value={`+${formatTimeShort(stats.timeLoss)}`} 
          subValue="ACCUMULATED" 
          icon={Hourglass}
          colorClass="text-rose-400"
          fontClass={fontClass}
          fontSize={fontSize}
        />

        {/* Row 5: Est. Hourly & Range */}
        <StatCell 
          label="Est. Hourly" 
          value={stats.hourlyRate} 
          subValue="UNITS / HR" 
          icon={Target}
          colorClass="text-cyan-400"
          fontClass={fontClass}
          fontSize={fontSize}
        />
         <StatCell 
          label="Range" 
          value={`+${formatSmart(stats.range)}`} 
          subValue="SPREAD" 
          icon={MoveHorizontal}
          colorClass="text-zinc-500"
          fontClass={fontClass}
          fontSize={fontSize}
        />

      </div>

      {/* Collapsible Glossary */}
      <div className="bg-zinc-950 mt-1 border-t border-zinc-900">
          <button 
            onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
            className="w-full px-4 py-3 bg-zinc-900 text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center justify-between active:bg-zinc-800 transition-colors"
          >
              <div className="flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  Technical Reference
              </div>
              {isGlossaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {isGlossaryOpen && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-zinc-950 pb-8">
                 <div className="px-4 py-2 text-[9px] text-zinc-600 font-mono border-b border-zinc-900 uppercase">
                    Select a metric for details
                </div>

                <MetricDescription 
                    icon={Clock} color="text-zinc-200"
                    title="Total Time"
                    description="Общее время сессии. Это сумма всех зафиксированных отрезков. Показывает реальную продолжительность работы."
                    formula="Sum(Round_Durations)"
                    isSelected={selectedMetric === 'total'}
                    onClick={() => toggleMetric('total')}
                />
                 <MetricDescription 
                    icon={TrendingUp} color="text-accent"
                    title="Average Time (Среднее)"
                    description="Среднее арифметическое всех кругов. Главный показатель вашего нормального, устойчивого темпа."
                    formula="Total_Time / Total_Rounds"
                    isSelected={selectedMetric === 'avg'}
                    onClick={() => toggleMetric('avg')}
                />
                 <MetricDescription 
                    icon={Zap} color="text-zinc-300"
                    title="Avg CPM"
                    description="Cycles Per Minute. Скорость производства: сколько операций вы бы сделали за минуту при текущем темпе."
                    formula="60000 / Average_Time_ms"
                    isSelected={selectedMetric === 'cpm'}
                    onClick={() => toggleMetric('cpm')}
                />
                <MetricDescription 
                    icon={Trophy} color="text-amber-400"
                    title="Best Lap (Рекорд)"
                    description="Ваш самый быстрый круг. Это демонстрация физического предела скорости для данной задачи."
                    formula="Min(Round_Durations)"
                    isSelected={selectedMetric === 'best'}
                    onClick={() => toggleMetric('best')}
                />
                <MetricDescription 
                    icon={Activity} color="text-emerald-500"
                    title="Stability (Стабильность)"
                    description="Оценка вашей ритмичности от 0% до 100%. Если 100% — вы работаете идеально ровно, как метроном. Ниже 80% — ритм рваный."
                    formula="(1 - (Standard_Deviation / Average_Time)) * 100"
                    isSelected={selectedMetric === 'stability'}
                    onClick={() => toggleMetric('stability')}
                />
                <MetricDescription 
                    icon={Percent} color="text-emerald-500"
                    title="Efficiency (Эффективность)"
                    description="Сравнение Среднего времени с Рекордом. Показывает, насколько близко вы работаете к своему максимуму."
                    formula="(Best_Lap / Average_Time) * 100"
                    isSelected={selectedMetric === 'eff'}
                    onClick={() => toggleMetric('eff')}
                />
                <MetricDescription 
                    icon={Hourglass} color="text-rose-400"
                    title="Time Loss (Потеря времени)"
                    description="Сколько времени суммарно вы 'потеряли' из-за того, что работали медленнее своего лучшего круга."
                    formula="Total_Time - (Best_Lap * Rounds_Count)"
                    isSelected={selectedMetric === 'loss'}
                    onClick={() => toggleMetric('loss')}
                />
                 <MetricDescription 
                    icon={Target} color="text-cyan-400"
                    title="Est. Hourly (Выработка)"
                    description="Прогноз на час: сколько единиц продукции вы сделаете, если продолжите работать в текущем темпе без остановок."
                    formula="3600000 / Average_Time_ms"
                    isSelected={selectedMetric === 'hourly'}
                    onClick={() => toggleMetric('hourly')}
                />
                 <MetricDescription 
                    icon={MoveHorizontal} color="text-zinc-500"
                    title="Range (Разброс)"
                    description="Разница между самым быстрым и самым медленным кругом. Чем меньше это число, тем предсказуемее процесс."
                    formula="Max_Time - Min_Time"
                    isSelected={selectedMetric === 'range'}
                    onClick={() => toggleMetric('range')}
                />
            </div>
          )}
      </div>
    </div>
  );
});

export default StatsPanel;
