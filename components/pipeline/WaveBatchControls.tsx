import React from 'react';

// ──── Types ────

interface WaveData {
  id: string;
  number: number;
  name: string;
  topicIds: string[];
  status: string;
}

interface WaveBatchControlsProps {
  waves: WaveData[];
  activeWaveId: string | null;
  isGenerating: boolean;
  onGenerateWave: (waveId: string) => void;
  onPauseGeneration?: () => void;
}

// ──── Completed statuses ────

const COMPLETED_STATUSES = new Set(['ready', 'published']);

function isWaveCompleted(wave: WaveData): boolean {
  return COMPLETED_STATUSES.has(wave.status);
}

// ──── Icons ────

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
      />
    </svg>
  );
}

// ──── Wave color map ────

const WAVE_BTN_COLORS: Record<number, { enabled: string; generating: string }> = {
  1: {
    enabled: 'bg-green-600 hover:bg-green-500 text-white',
    generating: 'bg-green-700 text-green-200',
  },
  2: {
    enabled: 'bg-blue-600 hover:bg-blue-500 text-white',
    generating: 'bg-blue-700 text-blue-200',
  },
  3: {
    enabled: 'bg-amber-600 hover:bg-amber-500 text-white',
    generating: 'bg-amber-700 text-amber-200',
  },
  4: {
    enabled: 'bg-purple-600 hover:bg-purple-500 text-white',
    generating: 'bg-purple-700 text-purple-200',
  },
};

// ──── Main Component ────

const WaveBatchControls: React.FC<WaveBatchControlsProps> = ({
  waves,
  activeWaveId,
  isGenerating,
  onGenerateWave,
  onPauseGeneration,
}) => {
  // Find the first non-completed wave index
  const firstAvailableIdx = waves.findIndex((w) => !isWaveCompleted(w));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300">Batch Generation</h4>
        {isGenerating && onPauseGeneration && (
          <button
            type="button"
            onClick={onPauseGeneration}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                       bg-red-600/20 text-red-400 border border-red-600/40 hover:bg-red-600/30 transition-colors"
          >
            <PauseIcon />
            Pause Generation
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {waves.map((wave, idx) => {
          const completed = isWaveCompleted(wave);
          const isCurrentlyGenerating = isGenerating && wave.id === activeWaveId;
          const isNextAvailable = idx === firstAvailableIdx && !isGenerating;
          const isFuture = !completed && idx > firstAvailableIdx;
          const colors = WAVE_BTN_COLORS[wave.number] ?? WAVE_BTN_COLORS[1];

          // Determine button state
          let buttonClasses: string;
          let disabled: boolean;
          let icon: React.ReactNode;
          let label: string;

          if (completed) {
            // Completed wave
            buttonClasses = 'bg-gray-700/50 text-green-400 border border-green-600/30 cursor-default';
            disabled = true;
            icon = <CheckIcon />;
            label = `Wave ${wave.number}`;
          } else if (isCurrentlyGenerating) {
            // Currently generating
            buttonClasses = `${colors.generating} cursor-wait`;
            disabled = true;
            icon = <SpinnerIcon />;
            label = `Wave ${wave.number}`;
          } else if (isNextAvailable) {
            // Next wave to generate
            buttonClasses = `${colors.enabled} shadow-sm cursor-pointer`;
            disabled = false;
            icon = <PlayIcon />;
            label = `Generate Wave ${wave.number}`;
          } else if (isFuture) {
            // Locked future wave
            buttonClasses = 'bg-gray-700/30 text-gray-500 border border-gray-700 cursor-not-allowed';
            disabled = true;
            icon = <LockIcon />;
            label = `Wave ${wave.number}`;
          } else {
            // Fallback: disabled during generation of another wave
            buttonClasses = 'bg-gray-700/30 text-gray-500 border border-gray-700 cursor-not-allowed';
            disabled = true;
            icon = <LockIcon />;
            label = `Wave ${wave.number}`;
          }

          return (
            <button
              key={wave.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onGenerateWave(wave.id)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-150
                ${buttonClasses}
              `}
              title={
                completed
                  ? `Wave ${wave.number} is complete`
                  : isFuture
                    ? `Complete Wave ${firstAvailableIdx + 1} first`
                    : isCurrentlyGenerating
                      ? `Generating Wave ${wave.number}...`
                      : `Generate all content for Wave ${wave.number}`
              }
            >
              {icon}
              <span>{label}</span>
              {!completed && (
                <span className="text-xs opacity-70">
                  ({wave.topicIds.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress hint */}
      {isGenerating && activeWaveId && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <SpinnerIcon />
          <span>
            Generating content for{' '}
            <span className="text-gray-300 font-medium">
              {waves.find((w) => w.id === activeWaveId)?.name ?? 'selected wave'}
            </span>
            ...
          </span>
        </div>
      )}
    </div>
  );
};

export default WaveBatchControls;
