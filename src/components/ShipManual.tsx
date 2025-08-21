import React, { useState } from 'react';

const manualPages = [
  {
    title: "Emergency Procedures",
    content: `HULL BREACH PROTOCOL
1. Seal compromised sections
2. Reroute life support
3. Initiate emergency repairs
4. Monitor pressure levels`
  },
  {
    title: "Navigation Systems",
    content: `COURSE PLOTTING
1. Calculate trajectory
2. Account for gravitational fields
3. Set navigation waypoints
4. Monitor alignment percentage`
  },
  {
    title: "Power Management",
    content: `BATTERY SYSTEMS
1. Monitor charge levels
2. Balance power distribution
3. Emergency power protocols
4. Backup system activation`
  },
  {
    title: "Life Support",
    content: `OXYGEN MANAGEMENT
1. Monitor O2 levels constantly
2. Check recycling systems
3. Emergency oxygen reserves
4. CO2 scrubber maintenance`
  }
];

export const ShipManual: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, manualPages.length - 1));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 h-full relative shadow-lg">
      {/* Notebook binding */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-red-300"></div>
      <div className="absolute left-8 top-0 bottom-0 w-px bg-red-300"></div>

      {/* Page content */}
      <div className="ml-8 h-full flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-amber-300 pb-2">
          {manualPages[currentPage].title}
        </h2>
        
        <div className="flex-1 text-gray-700 text-sm leading-relaxed whitespace-pre-line font-mono">
          {manualPages[currentPage].content}
        </div>

        {/* Page controls */}
        <div className="flex justify-between items-center mt-4 relative">
          {/* Left page curl */}
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className="relative group"
          >
            <div className="w-8 h-8 bg-amber-100 border border-amber-300 rounded-tl-lg transform rotate-12 transition-all group-hover:rotate-6 group-disabled:opacity-50">
              <div className="absolute inset-1 bg-amber-50 rounded-tl border-r border-b border-amber-200"></div>
            </div>
          </button>

          {/* Page counter */}
          <div className="text-gray-600 text-sm font-mono">
            Page {currentPage + 1} of {manualPages.length}
          </div>

          {/* Right page curl */}
          <button
            onClick={nextPage}
            disabled={currentPage === manualPages.length - 1}
            className="relative group"
          >
            <div className="w-8 h-8 bg-amber-100 border border-amber-300 rounded-tr-lg transform -rotate-12 transition-all group-hover:-rotate-6 group-disabled:opacity-50">
              <div className="absolute inset-1 bg-amber-50 rounded-tr border-l border-b border-amber-200"></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};