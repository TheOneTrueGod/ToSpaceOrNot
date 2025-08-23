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


	return (
		<div className="bg-gray-800 p-6 h-full">
			<h2 className="text-white text-xl font-mono mb-4">Navigation Station</h2>

			{/* Single container for all inputs */}
			<div className="bg-gray-400 p-4 rounded-lg border border-gray-300">
				<div className="flex items-center space-x-4">
					{/* Pitch Input */}
					<div className="flex-1 flex flex-col items-center">
						<label className="block text-sm font-mono text-gray-700 mb-2">Pitch</label>
						<input
							type="number"
							step="0.1"
							value={localValues.pitch}
							onChange={(e) => handleInputChange('pitch', e.target.value)}
							className="w-full px-2 py-1 bg-white border border-gray-600 rounded font-mono text-sm text-gray-900"
						/>
					</div>

					{/* Yaw Input */}
					<div className="flex-1 flex flex-col items-center">
						<label className="block text-sm font-mono text-gray-700 mb-2">Yaw</label>
						<input
							type="number"
							step="0.1"
							value={localValues.yaw}
							onChange={(e) => handleInputChange('yaw', e.target.value)}
							className="w-full px-2 py-1 bg-white border border-gray-600 rounded font-mono text-sm text-gray-900"
						/>
					</div>

					{/* Roll Input */}
					<div className="flex-1 flex flex-col items-center">
						<label className="block text-sm font-mono text-gray-700 mb-2">Roll</label>
						<input
							type="number"
							step="0.1"
							value={localValues.roll}
							onChange={(e) => handleInputChange('roll', e.target.value)}
							className="w-full px-2 py-1 bg-white border border-gray-600 rounded font-mono text-sm text-gray-900"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
