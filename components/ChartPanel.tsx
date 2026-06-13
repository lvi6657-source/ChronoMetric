
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Round } from '../types';
import { formatSmart } from '../utils/format';
import { APP_CONFIG } from '../config';

interface ChartPanelProps {
  rounds: Round[];
  averageTime: number;
  targetTime?: number | null;
}

// Custom Tooltip with Strict Line Following
const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
    if (active && payload && payload.length && coordinate) {
        const data = payload[0].payload;
        
        // Logic:
        // 1. Always strictly follow X (left: coordinate.x)
        // 2. Always strictly follow Y (top: coordinate.y)
        // 3. Default: Display on the LEFT side of the line (translate -100%)
        // 4. Exception: If X < 100px (Left edge), display on RIGHT side.
        // 5. Vertical: Always shift UP (-100%) + margin to stay above finger.
        
        const EDGE_THRESHOLD = 100;
        const GAP = 4; 
        
        const isLeftEdge = coordinate.x < EDGE_THRESHOLD;

        // CSS Transform to position relative to the point
        // X: If left edge -> move right (GAP). Else -> move left (-100% - GAP)
        // Y: Move up (-100%) and add extra spacing
        const transformX = isLeftEdge ? `${GAP}px` : `calc(-100% - ${GAP}px)`;
        const transformY = `calc(-100% - ${APP_CONFIG.chart.tooltipVerticalOffset}px)`;

        return (
            <div 
                className="absolute bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-mono p-2 shadow-xl rounded-sm z-50"
                style={{
                    left: coordinate.x,
                    top: coordinate.y,
                    transform: `translate(${transformX}, ${transformY})`,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}
            >
                <div className="flex justify-between items-center gap-4 mb-1 border-b border-zinc-800 pb-1">
                    <span className="text-zinc-500">#{label}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between gap-4">
                        <span className="text-emerald-500">Time:</span>
                        <span className="font-bold">{formatSmart(data.time)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Avg:</span>
                        <span>{formatSmart(data.avg)}</span>
                    </div>
                    {data.target && (
                        <div className="flex justify-between gap-4">
                            <span className="text-cyan-500">Takt:</span>
                            <span>{formatSmart(data.target)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const ChartPanel: React.FC<ChartPanelProps> = React.memo(({ rounds, averageTime, targetTime }) => {
  if (rounds.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-600 font-narrow text-xs bg-zinc-900/20">
        <span>AWAITING DATA</span>
        <span className="text-[10px] opacity-50 mt-1">Start timer to visualize</span>
      </div>
    );
  }

  const data = rounds.map((r) => ({
    id: r.id,
    time: r.duration,
    avg: averageTime,
    target: targetTime || null
  }));

  return (
    <div className="w-full h-full font-narrow text-[10px] select-none relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: APP_CONFIG.chart.marginTop, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="id" hide />
          <YAxis domain={['auto', 'auto']} hide width={0} />
          
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
            isAnimationActive={false}
          />
          
          <ReferenceLine y={averageTime} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.6} />
          
          {targetTime && targetTime > 0 && (
             <ReferenceLine y={targetTime} stroke="#06b6d4" strokeDasharray="5 5" strokeWidth={1} opacity={0.8} />
          )}
          
          <Line
            type="monotone"
            dataKey="time"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#10b981', stroke: '#fff' }}
            isAnimationActive={false}
            animationDuration={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ChartPanel;
