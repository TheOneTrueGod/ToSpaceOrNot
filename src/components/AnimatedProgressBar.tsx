import React, { useEffect, useState, useRef } from 'react';

interface AnimatedProgressBarProps {
	percent: number;
	direction?: 'horizontal' | 'vertical';
	colour?: string;
	animateColour?: string;
	backgroundColour?: string;
	className?: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
	percent,
	direction = 'horizontal',
	colour = 'bg-gray-600',
	animateColour = 'bg-blue-400',
	backgroundColour = 'bg-blue-900',
	className = ''
}) => {
	const [mainPercent, setMainPercent] = useState(percent);
	const [animatedPercent, setAnimatedPercent] = useState(percent);
	const [mainTransition, setMainTransition] = useState(true);
	const [animatedTransition, setAnimatedTransition] = useState(true);
	const prevPercentRef = useRef(percent);

	useEffect(() => {
		const prevPercent = prevPercentRef.current;
		prevPercentRef.current = percent;
		if (percent > prevPercent) {
			// Increasing: animated bar jumps immediately (remove transition for 1 frame), main bar catches up
			setAnimatedTransition(false);
			setMainTransition(true);
			setAnimatedPercent(percent);
			
			// Delay the main bar update to create the catch-up effect
			const timer = setTimeout(() => {
				setAnimatedTransition(true);
				setMainPercent(percent);
			}, 50);
			return () => clearTimeout(timer);
		} else if (percent < prevPercent) {
			// Decreasing: main bar jumps immediately (remove transition for 1 frame), animated bar catches up
			setMainTransition(false);
			setAnimatedTransition(true);
			setMainPercent(percent);
			
			// Delay the animated bar update to create the catch-up effect
			const timer = setTimeout(() => {
				setMainTransition(true);
				setAnimatedPercent(percent);
			}, 50);
			return () => clearTimeout(timer);
		}
		
	}, [percent]);

	const clampedMainPercent = Math.max(0, Math.min(100, mainPercent));
	const clampedAnimatedPercent = Math.max(0, Math.min(100, animatedPercent));

	const containerClass = direction === 'horizontal' 
		? 'relative w-full h-2' 
		: 'relative w-2 h-full';

	const mainBarStyle = direction === 'horizontal'
		? { width: `${clampedMainPercent}%`, height: '100%' }
		: { height: `${clampedMainPercent}%`, width: '100%' };

	const animatedBarStyle = direction === 'horizontal'
		? { width: `${clampedAnimatedPercent}%`, height: '100%' }
		: { height: `${clampedAnimatedPercent}%`, width: '100%' };

	return (
		<div className={`${containerClass} ${backgroundColour} rounded ${className}`}>
			<div 
				className={`absolute top-0 left-0 ${animateColour} rounded ${animatedTransition ? 'transition-all duration-1000 ease-out' : ''}`}
				style={animatedBarStyle}
			/>
			<div 
				className={`absolute top-0 left-0 ${colour} rounded ${mainTransition ? 'transition-all duration-1000 ease-out' : ''}`}
				style={mainBarStyle}
			/>
		</div>
	);
};