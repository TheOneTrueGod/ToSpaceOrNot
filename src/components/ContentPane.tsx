import clsx from "clsx";
import React from "react";

type Props = {
  children: React.ReactNode;
  className: string;
};

export const ContentPane: React.FC<Props> = ({ children, className }) => {
  return (
    <div
      className={clsx(
        "bg-gray-700 border border-gray-600 rounded-lg",
        "p-2",
        className
      )}
    >
      {children}
    </div>
  );
};
