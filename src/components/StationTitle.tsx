import React from 'react';

interface StationTitleProps {
  children: React.ReactNode;
}

export const StationTitle: React.FC<StationTitleProps> = ({ children }) => {
  return (
    <h2 className="text-2xl font-mono text-white text-center mb-8">
      {children}
    </h2>
  );
};