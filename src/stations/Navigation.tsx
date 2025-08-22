import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateNavigationValue } from '../store/stations/navigationStore';

export const Navigation: React.FC = () => {
	const dispatch = useDispatch();
	const navigationState = useSelector((state: RootState) => state.navigation);

	// Local state for input values
	const [localValues, setLocalValues] = useState({
		pitch: navigationState.current.pitch.toString(),
		yaw: navigationState.current.yaw.toString(),
		roll: navigationState.current.roll.toString()
	});

	// Update local state when store changes
	useEffect(() => {
		setLocalValues({
			pitch: navigationState.current.pitch.toString(),
			yaw: navigationState.current.yaw.toString(),
			roll: navigationState.current.roll.toString()
		});
	}, [navigationState.current]);

	const handleInputChange = (axis: 'pitch' | 'yaw' | 'roll', value: string) => {
		const numValue = parseFloat(value) || 0;

		// Update local state immediately for responsive UI
		setLocalValues(prev => ({
			...prev,
			[axis]: value
		}));

		// Update the store
		dispatch(updateNavigationValue({ axis, value: numValue }));
	};

	const getValueColor = (axis: 'pitch' | 'yaw' | 'roll') => {
		const current = navigationState.current[axis];
		const correct = navigationState.correct[axis];
		const difference = Math.abs(current - correct);

		if (difference === 0) return 'text-green-400';
		if (difference <= 1) return 'text-yellow-400';
		if (difference <= 5) return 'text-orange-400';
		return 'text-red-400';
	};

	return (
		<div className="w-full max-w-md mx-auto">
			<h2 className="text-2xl font-mono text-white text-center mb-6">Navigation Station</h2>

			<div className="space-y-6">
				{/* Pitch Input */}
				<div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
					<label className="block text-sm font-mono text-gray-300 mb-2">Pitch</label>
					<div className="flex items-center space-x-3">
						<input
							type="number"
							step="0.1"
							value={localValues.pitch}
							onChange={(e) => handleInputChange('pitch', e.target.value)}
							className={`flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded font-mono text-lg ${getValueColor('pitch')}`}
						/>
						<span className="text-gray-400 font-mono">°</span>
					</div>
				</div>

				{/* Yaw Input */}
				<div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
					<label className="block text-sm font-mono text-gray-300 mb-2">Yaw</label>
					<div className="flex items-center space-x-3">
						<input
							type="number"
							step="0.1"
							value={localValues.yaw}
							onChange={(e) => handleInputChange('yaw', e.target.value)}
							className={`flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded font-mono text-lg ${getValueColor('yaw')}`}
						/>
						<span className="text-gray-400 font-mono">°</span>
					</div>
				</div>

				{/* Roll Input */}
				<div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
					<label className="block text-sm font-mono text-gray-300 mb-2">Roll</label>
					<div className="flex items-center space-x-3">
						<input
							type="number"
							step="0.1"
							value={localValues.roll}
							onChange={(e) => handleInputChange('roll', e.target.value)}
							className={`flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded font-mono text-lg ${getValueColor('roll')}`}
						/>
						<span className="text-gray-400 font-mono">°</span>
					</div>
				</div>
			</div>
		</div>
	);
};
