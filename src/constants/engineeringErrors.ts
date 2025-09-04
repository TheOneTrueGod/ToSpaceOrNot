import { EngineeringSystems, PENALTY_CONFIG } from "../store/stations/engineeringStore";

export interface ErrorMessage {
	shortDescription: string;
	longDescription: string;
	severity: 'success' | 'warning' | 'danger' | 'critical' | 'normal';
	hideInStation?: boolean;
	hideInSummary?: boolean;
}

export interface StationErrors {
	Base: ErrorMessage;
	Warning: ErrorMessage;
	Danger: ErrorMessage;
	Critical: ErrorMessage;
}

export const ENGINEERING_ERRORS: { [station: string]: StationErrors } = {
	Weapons: {
		Base: {
			shortDescription: 'System Boosted',
			longDescription: 'Cooldowns decreased by 50%',
			severity: 'success',
		},
		Warning: {
			shortDescription: 'System Nominal',
			longDescription: 'Cooldowns are normal',
			severity: 'normal',
			hideInSummary: true,
		},
		Danger: {
			shortDescription: 'Wiring Error',
			longDescription: 'Cooldowns increased by {percentage}%',
			severity: 'danger'
		},
		Critical: {
			shortDescription: 'Wiring Critical',
			longDescription: 'Cooldowns increased by {percentage}%',
			severity: 'critical'
		}
	},
	Power: {
		Base: {
			shortDescription: 'System Boosted',
			longDescription: 'Power Regeneration increased by 100%',
			severity: 'success',
		},
		Warning: {
			shortDescription: 'System Nominal',
			longDescription: 'Regeneration is normal',
			severity: 'normal',
			hideInSummary: true,
		},
		Danger: {
			shortDescription: 'Wiring Error',
			longDescription: 'Regeneration slowed by {percentage}%',
			severity: 'danger'
		},
		Critical: {
			shortDescription: 'Wiring Critical',
			longDescription: 'Regeneration slowed by {percentage}%',
			severity: 'critical'
		}
	},
	Fuel: {
		Base: {
			shortDescription: 'System Boosted',
			longDescription: 'Cooldowns decreased by 50%',
			severity: 'success',
		},
		Warning: {
			shortDescription: 'System Nominal',
			longDescription: 'Cooldowns are normal',
			severity: 'normal',
			hideInSummary: true,
		},
		Danger: {
			shortDescription: 'Wiring Error',
			longDescription: 'Cooldowns increased by {percentage}%',
			severity: 'danger'
		},
		Critical: {
			shortDescription: 'Wiring Critical',
			longDescription: 'Cooldowns increased by {percentage}%',
			severity: 'critical'
		}
	},
	Thrust: {
		Base: {
			shortDescription: 'System Boosted',
			longDescription: 'Ship speed increased by 100%',
			severity: 'success',
		},
		Warning: {
			shortDescription: 'System Nominal',
			longDescription: 'Ship speed is normal',
			severity: 'normal',
			hideInSummary: true,
		},
		Danger: {
			shortDescription: 'Wiring Error',
			longDescription: 'Ship speed decreased by {percentage}%',
			severity: 'danger'
		},
		Critical: {
			shortDescription: 'Wiring Critical',
			longDescription: 'Ship speed decreased by {percentage}%',
			severity: 'critical'
		}
	},
};

// Helper function to get formatted error message
export const getEngineeringErrorMessage = (
	station: string,
	severity: 'Base' | 'Warning' | 'Danger' | 'Critical',
	penalty?: number
): string => {
	const errors = ENGINEERING_ERRORS[station];
	if (!errors || !penalty) {
		return `${station} System Nominal: All systems operating normally`;
	}

	const error = errors[severity];
	const percentage = Math.round((penalty! - 1) * 100);
	const longDescription = error.longDescription.replace('{percentage}', percentage.toString());

	return `${station} ${error.shortDescription}: ${longDescription}`;
};

// Helper function to get short alert title for AutomaticAlertSystem
export const getEngineeringAlertTitle = (
	station: string,
	severity: 'Warning' | 'Danger' | 'Critical' | 'Base'
): string => {
	const errors = ENGINEERING_ERRORS[station];
	if (!errors) {
		return `${station} ${severity}`;
	}

	return `${station} ${errors[severity].shortDescription}`;
};

// Helper function to determine current engineering severity based on penalty
export const getEngineeringSeverity = (penalty: number): 'Base' | 'Warning' | 'Danger' | 'Critical' => {
	if (penalty >= PENALTY_CONFIG.HEAVY_MULTIPLIER) return 'Critical';
	if (penalty >= PENALTY_CONFIG.MEDIUM_MULTIPLIER) return 'Danger';
	if (penalty >= PENALTY_CONFIG.LIGHT_MULTIPLIER) return 'Warning';
	return 'Base';
};

// Helper function to check if error should be hidden in station display
export const shouldHideInStation = (station: string, severity: 'Base' | 'Warning' | 'Danger' | 'Critical'): boolean => {
	const errors = ENGINEERING_ERRORS[station];
	if (!errors) return false;
	return errors[severity].hideInStation === true;
};

// Helper function to check if error should be hidden in summary display
export const shouldHideInSummary = (station: string, severity: 'Base' | 'Warning' | 'Danger' | 'Critical'): boolean => {
	const errors = ENGINEERING_ERRORS[station];
	if (!errors) return false;
	return errors[severity].hideInSummary === true;
};

// Engineering alert object interface
export interface EngineeringAlert {
	system: string;
	severity: 'Base' | 'Warning' | 'Danger' | 'Critical';
	displaySeverity: 'success' | 'warning' | 'danger' | 'critical' | 'normal';
	title: string;
	message: string;
	penalty?: number;
}

// Shared function to get engineering alerts for stations and StatusMonitor
export const getEngineeringAlerts = (
	systemPenalties: Array<{ name: EngineeringSystems; penalty: number }>,
	includeSystems?: EngineeringSystems[],
	context: 'station' | 'summary' = 'summary'
): EngineeringAlert[] => {
	// Filter systems if includeSystems is provided
	const systemsToCheck = includeSystems
		? systemPenalties.filter(system => includeSystems.includes(system.name))
		: systemPenalties;

	const alerts: EngineeringAlert[] = [];

	systemsToCheck.forEach(system => {
		const severity = getEngineeringSeverity(system.penalty);

		// Check if this alert should be hidden based on context
		const shouldHide = context === 'station'
			? shouldHideInStation(system.name, severity)
			: shouldHideInSummary(system.name, severity);

		if (!shouldHide) {
			// Get display severity from the ENGINEERING_ERRORS map
			const systemErrors = ENGINEERING_ERRORS[system.name];
			const displaySeverity = systemErrors ? systemErrors[severity].severity : 'warning';

			alerts.push({
				system: system.name,
				title: getEngineeringAlertTitle(system.name, severity),
				severity,
				displaySeverity,
				message: getEngineeringErrorMessage(system.name, severity, system.penalty),
				penalty: system.penalty
			});
		}
	});

	return alerts;
};