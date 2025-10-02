import clsx from "clsx";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export const MobilePageTitle: React.FC<Props> = ({ children }) => {
  return (
    <h1
      className={clsx(
        "text-6xl font-bold text-center",
        "bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600",
        "mt-4 bg-clip-text text-transparent"
      )}
    >
      {children}
    </h1>
  );
};
