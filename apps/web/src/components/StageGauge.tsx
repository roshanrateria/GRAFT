/**
 * StageGauge Component
 *
 * A thermometer-style gauge for immune system stages.
 * Four stages: Static, Manifest, Behavioral, Property
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import './StageGauge.css';

export type StageName = 'static' | 'manifest' | 'behavioral' | 'property';

export interface StageGaugeProps {
  /** Current stage being executed */
  currentStage: StageName | null;

  /** Stages that have passed */
  passedStages: StageName[];

  /** Stages that have failed */
  failedStages: StageName[];

  /** Whether the immune system is running */
  isActive: boolean;

  /** Optional className for additional styling */
  className?: string;
}

const STAGES: { name: StageName; label: string }[] = [
  { name: 'static', label: 'Static' },
  { name: 'manifest', label: 'Manifest' },
  { name: 'behavioral', label: 'Behavioral' },
  { name: 'property', label: 'Property' },
];

/**
 * StageGauge - Four thermometer bars for immune system stages.
 */
export function StageGauge({
  currentStage,
  passedStages,
  failedStages,
  isActive,
  className,
}: StageGaugeProps) {
  const getStageState = (stage: StageName): 'pending' | 'running' | 'passed' | 'failed' => {
    if (failedStages.includes(stage)) return 'failed';
    if (passedStages.includes(stage)) return 'passed';
    if (currentStage === stage) return 'running';
    return 'pending';
  };

  return (
    <div
      className={`stage-gauge ${className || ''} ${isActive ? 'stage-gauge--active' : ''}`}
      role="group"
      aria-label="Immune system stage gauges"
    >
      {STAGES.map((stage, index) => {
        const state = getStageState(stage.name);
        return (
          <div
            key={stage.name}
            className={`stage-gauge__bar stage-gauge__bar--${state}`}
            style={{ animationDelay: `${index * 100}ms` }}
            role="status"
            aria-label={`${stage.label} analysis: ${state}`}
          >
            <div className="stage-gauge__fill" />
            <span className="stage-gauge__label">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default StageGauge;
