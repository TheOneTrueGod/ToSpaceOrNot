import React from 'react';

interface StationTitleProps {
	children: React.ReactNode;
	className?: string
}

export const StationTitle: React.FC<StationTitleProps> = ({ children, className = '' }) => {
	return (
		<h2 className={`text-2xl font-mono text-white text-center mb-8 ${className}`}>
			{children}
		</h2>
	);
};