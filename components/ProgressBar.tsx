import React from 'react';

interface ProgressBarProps {
  elapsed: number;
  reference: number;
  mode: 'target' | 'average' | 'hidden';
}

const ProgressBar = React.memo(({ elapsed, reference, mode }: ProgressBarProps) => {
  // Hidden mode or invalid reference -> Render nothing (or just empty track)
  if (mode === 'hidden' || !reference || reference <= 0) return null;

  const ratio = elapsed / reference;
  // Cap visual width at 100% (Overrun is indicated by color)
  const percentage = Math.min(ratio * 100, 100);
  
  // Color Logic:
  // 0% - 90%: Emerald (Normal)
  // 90% - 100%: Amber (Warning)
  // > 100%: Red (Overrun)
  let colorClass = 'bg-emerald-500';
  if (ratio >= 1.0) {
    colorClass = 'bg-red-500';
  } else if (ratio > 0.9) {
    colorClass = 'bg-amber-500';
  }

  return (
    <div className="absolute bottom-0 left-0 w-full h-[4px] bg-zinc-900 z-40 pointer-events-none">
      <div 
        className={`h-full ${colorClass} will-change-transform`}
        style={{ 
            width: '100%',
            transform: `scaleX(${percentage / 100})`,
            transformOrigin: 'left'
        }}
      />
    </div>
  );
});

export default ProgressBar;