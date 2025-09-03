export interface ErrorMessage {
  shortDescription: string;
  longDescription: string;
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
      shortDescription: 'System Nominal',
      longDescription: 'All systems operating normally'
    },
    Warning: {
      shortDescription: 'Wiring Error',
      longDescription: 'Cooldowns increased by {percentage}%'
    },
    Danger: {
      shortDescription: 'System Error',
      longDescription: 'Cooldowns increased by {percentage}%'
    },
    Critical: {
      shortDescription: 'System Critical',
      longDescription: 'Cooldowns increased by {percentage}%'
    }
  },
  Power: {
    Base: {
      shortDescription: 'System Nominal',
      longDescription: 'All systems operating normally'
    },
    Warning: {
      shortDescription: 'Wiring Error',
      longDescription: 'Regeneration slowed by {percentage}%'
    },
    Danger: {
      shortDescription: 'System Error',
      longDescription: 'Regeneration slowed by {percentage}%'
    },
    Critical: {
      shortDescription: 'System Critical',
      longDescription: 'Regeneration slowed by {percentage}%'
    }
  },
  Fuel: {
    Base: {
      shortDescription: 'System Nominal',
      longDescription: 'All systems operating normally'
    },
    Warning: {
      shortDescription: 'Wiring Error',
      longDescription: 'Cooldowns increased by {percentage}%'
    },
    Danger: {
      shortDescription: 'System Error',
      longDescription: 'Cooldowns increased by {percentage}%'
    },
    Critical: {
      shortDescription: 'System Critical',
      longDescription: 'Cooldowns increased by {percentage}%'
    }
  }
};

// Helper function to get formatted error message
export const getEngineeringErrorMessage = (
  station: string,
  severity: 'Base' | 'Warning' | 'Danger' | 'Critical',
  penalty?: number
): string => {
  const errors = ENGINEERING_ERRORS[station];
  if (!errors) {
    if (severity === 'Base') {
      return `${station} System Nominal: All systems operating normally`;
    }
    return `${station} ${severity}: Performance reduced by ${Math.round((penalty! - 1) * 100)}%`;
  }

  const error = errors[severity];
  if (severity === 'Base') {
    return `${station} ${error.shortDescription}: ${error.longDescription}`;
  }
  
  const percentage = Math.round((penalty! - 1) * 100);
  const longDescription = error.longDescription.replace('{percentage}', percentage.toString());
  
  return `${station} ${error.shortDescription}: ${longDescription}`;
};

// Helper function to get short alert title for AutomaticAlertSystem
export const getEngineeringAlertTitle = (
  station: string,
  severity: 'Warning' | 'Danger' | 'Critical'
): string => {
  const errors = ENGINEERING_ERRORS[station];
  if (!errors) {
    return `${station} ${severity}`;
  }

  return `${station} ${errors[severity].shortDescription}`;
};

// Helper function to get detailed alert description for AutomaticAlertSystem
export const getEngineeringAlertDescription = (
  station: string,
  severity: 'Warning' | 'Danger' | 'Critical',
  penalty: number
): string => {
  const errors = ENGINEERING_ERRORS[station];
  const percentage = Math.round((penalty - 1) * 100);
  
  if (!errors) {
    return `${station} system experiencing issues. Performance reduced by ${percentage}%.`;
  }

  const severityMessages = {
    Warning: `${station} panel has wiring errors. Performance reduced by ${percentage}%.`,
    Danger: `${station} system experiencing errors. Performance reduced by ${percentage}%.`,
    Critical: `${station} system severely damaged. Performance reduced by ${percentage}%.`
  };

  return severityMessages[severity];
};

// Helper function to determine current engineering severity based on penalty
export const getEngineeringSeverity = (penalty: number): 'Base' | 'Warning' | 'Danger' | 'Critical' => {
  if (penalty >= 5.0) return 'Critical';
  if (penalty >= 2.0) return 'Danger';
  if (penalty >= 1.5) return 'Warning';
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