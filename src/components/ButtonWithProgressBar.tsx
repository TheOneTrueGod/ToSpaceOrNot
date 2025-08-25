import React from 'react';

interface ButtonWithProgressBarProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
  cooldownRemaining?: number;
  maxCooldown?: number;
  className?: string;
  baseColor?: string;
  disabledColor?: string;
  tooltip?: string;
  showCooldownInLabel?: boolean;
}

export const ButtonWithProgressBar: React.FC<ButtonWithProgressBarProps> = ({
  onClick,
  disabled,
  label,
  cooldownRemaining = 0,
  maxCooldown = 10,
  className = '',
  baseColor = 'bg-blue-600 hover:bg-blue-700',
  disabledColor = 'bg-gray-600',
  tooltip,
  showCooldownInLabel = true,
}) => {
  const isOnCooldown = cooldownRemaining > 0;
  const cooldownProgress = isOnCooldown ? 1 - (cooldownRemaining / maxCooldown) : 1;
  
  const buttonClasses = `px-4 py-2 rounded font-mono text-sm text-white relative overflow-hidden transition-all ${
    disabled ? `${disabledColor} text-gray-400 cursor-not-allowed` : `${baseColor}`
  } ${className}`;

  const displayLabel = showCooldownInLabel && isOnCooldown ? `${label} (${cooldownRemaining}s)` : label;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
      title={tooltip}
    >
      {/* Cooldown progress bar overlay */}
      {isOnCooldown && (
        <div
          className="absolute inset-0 bg-white opacity-20 transition-transform duration-100 ease-linear"
          style={{
            transform: `translateX(${(cooldownProgress - 1) * 100}%)`,
            width: '100%'
          }}
        />
      )}
      <span className="relative z-10">{displayLabel}</span>
    </button>
  );
};