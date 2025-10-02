import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
  background?: "stars" | "none";
};

export const MobilePageWrapper: React.FC<Props> = ({
  children,
  className,
  background = "stars",
}) => {
  return (
    <div
      className={clsx(
        "h-screen w-screen overflow-hidden",
        "bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900",
        "relative",
        className
      )}
    >
      <div
        className={clsx(
          "h-full w-full",
          "flex flex-col gap-4 items-center p-4",
          "z-10 relative"
        )}
      >
        {children}
      </div>
      {/* Background stars */}
      {background === "stars" && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
