import React from 'react';
import { AlertTriangle, AlertCircle, AlertOctagon, CheckCircle, ChevronRightCircle } from 'lucide-react';

export type AlertSeverity = 'normal' | 'success' | 'warning' | 'danger' | 'critical';
export type AlertVariant = 'compact' | 'full';

export interface AlertProps {
	title: string;
	description?: string;
	severity: AlertSeverity;
	variant?: AlertVariant;
	className?: string;
}

const getSeverityStyles = (severity: AlertSeverity): string => {
	switch (severity) {
		case 'critical':
			return 'text-red-400 bg-red-900/20 border-red-500';
		case 'danger':
			return 'text-orange-400 bg-orange-900/20 border-orange-500';
		case 'warning':
			return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
		case 'success':
			return 'text-green-400 bg-green-900/20 border-green-500';
		case 'normal':
			return 'text-white bg-gray-700/20 border-white';
		default:
			return 'text-gray-400 bg-gray-900/20 border-gray-500';
	}
};

const getSeverityIcon = (severity: AlertSeverity, variant: AlertVariant = 'full'): React.ReactNode => {
	const iconSize = variant === 'compact' ? 16 : 20;
	const iconClass = variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5';

	switch (severity) {
		case 'critical':
			return <AlertOctagon size={iconSize} className={`text-red-400 ${iconClass}`} />;
		case 'danger':
			return <AlertTriangle size={iconSize} className={`text-orange-400 ${iconClass}`} />;
		case 'warning':
			return <AlertCircle size={iconSize} className={`text-yellow-400 ${iconClass}`} />;
		case 'success':
			return <CheckCircle size={iconSize} className={`text-green-400 ${iconClass}`} />;
		case 'normal':
			return <ChevronRightCircle size={iconSize} className={`text-white ${iconClass}`} />;
		default:
			return <AlertCircle size={iconSize} className={`text-gray-400 ${iconClass}`} />;
	}
};

export const Alert: React.FC<AlertProps> = ({
	title,
	description,
	severity,
	variant = 'full',
	className = ''
}) => {
	const severityStyles = getSeverityStyles(severity);
	const icon = getSeverityIcon(severity, variant);

	if (variant === 'compact') {
		return (
			<div className={`p-2 rounded border ${severityStyles} ${className}`}>
				<div className="flex items-center space-x-2">
					{icon}
					<div className="font-semibold text-xs">{title}</div>
				</div>
				{description && (
					<div className="text-xs mt-1 opacity-75">{description}</div>
				)}
			</div>
		);
	}

	// Full variant (default for stations)
	return (
		<div className={`flex items-center gap-2 px-3 py-2 rounded border ${severityStyles} ${className}`}>
			{icon}
			<div className="flex flex-col flex-1">
				<span className="font-mono text-sm">{title}</span>
				{description && (
					<span className="font-mono text-xs opacity-75 mt-1">{description}</span>
				)}
			</div>
		</div>
	);
};