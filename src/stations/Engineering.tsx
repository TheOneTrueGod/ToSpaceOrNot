import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import {
  updatePanelConnections,
  toggleSchematicView,
} from "../store/stations/engineeringStore";
import {
  DEBUG_MODE,
  PANEL_SYSTEM_MAPPING,
  getPenaltyMultiplier,
  countIncorrectConnections,
} from "../store/stations/engineeringStore";

interface WireConnection {
  from: { type: "input" | "node" | "output"; index: number };
  to: { type: "input" | "node" | "output"; index: number };
}

interface PanelState {
  connections: WireConnection[];
}

const PANEL_SIZE = 250;
const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"]; // red, blue, green, yellow

// Helper function to get penalty info for a panel
const getPanelPenaltyInfo = (
  panelName: string,
  engineeringState: {
    panels: { [key: string]: PanelState };
    correctState: {
      Gobi: { [key: string]: PanelState };
      Ben: { [key: string]: PanelState };
    };
  },
  currentPlayer: "Gobi" | "Ben"
) => {
  const currentPanel = engineeringState.panels[panelName];
  const correctPanel = engineeringState.correctState[currentPlayer][panelName];

  if (!currentPanel || !correctPanel)
    return { multiplier: 1, incorrectCount: 0 };

  const incorrectCount = countIncorrectConnections(
    currentPanel.connections,
    correctPanel.connections
  );
  const multiplier = getPenaltyMultiplier(
    panelName,
    engineeringState,
    currentPlayer
  );

  return { multiplier, incorrectCount };
};

export const Engineering: React.FC = () => {
  const dispatch = useDispatch();
  const engineeringState = useSelector((state: RootState) => state.engineering);
  const currentPlayer = useSelector(
    (state: RootState) => state.game.currentPlayer
  );

  // Get the other player's name
  const otherPlayer = currentPlayer === "Gobi" ? "Ben" : "Gobi";

  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    from: { type: "input" | "node" | "output"; index: number } | null;
    mousePos: { x: number; y: number };
  }>({
    isDragging: false,
    from: null,
    mousePos: { x: 0, y: 0 },
  });
  const [hoveredWire, setHoveredWire] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDragState((prev) => ({
          ...prev,
          mousePos: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
        }));
      }
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        setDragState({
          isDragging: false,
          from: null,
          mousePos: { x: 0, y: 0 },
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState.isDragging]);

  const handlePanelClick = (panelName: string) => {
    setOpenPanel(openPanel === panelName ? null : panelName);
  };

  const handleSchematicToggle = () => {
    dispatch(toggleSchematicView());
    setOpenPanel(null); // Close any open panel when switching modes
  };

  const handleNodeMouseDown = (
    type: "input" | "node" | "output",
    index: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    if (!containerRef.current || engineeringState.isViewingSchematic) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragState({
      isDragging: true,
      from: { type, index },
      mousePos: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    });
  };

  const handleNodeMouseUp = (
    type: "input" | "node" | "output",
    index: number
  ) => {
    if (
      dragState.isDragging &&
      dragState.from &&
      openPanel &&
      !engineeringState.isViewingSchematic
    ) {
      const newConnection: WireConnection = {
        from: dragState.from,
        to: { type, index },
      };

      // Don't allow connections to the same node
      if (dragState.from.type === type && dragState.from.index === index) {
        return;
      }

      const currentPanel = engineeringState.panels[openPanel];
      const updatedConnections = [...currentPanel.connections, newConnection];

      dispatch(
        updatePanelConnections({
          panelName: openPanel,
          connections: updatedConnections,
        })
      );
    }
  };

  const handleWireClick = (wireIndex: number) => {
    if (openPanel && !engineeringState.isViewingSchematic) {
      const currentPanel = engineeringState.panels[openPanel];
      const updatedConnections = currentPanel.connections.filter(
        (_, index) => index !== wireIndex
      );
      setHoveredWire(null);

      dispatch(
        updatePanelConnections({
          panelName: openPanel,
          connections: updatedConnections,
        })
      );
    }
  };

  const getMousePosInCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const distancePointToSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return Math.hypot(px - x1, py - y1);
    }
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const projX = x1 + clampedT * dx;
    const projY = y1 + clampedT * dy;
    return Math.hypot(px - projX, py - projY);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!openPanel) return;
    const { x, y } = getMousePosInCanvas(e);
    const panelState = engineeringState.panels[openPanel];
    const threshold = 8;
    let foundIndex: number | null = null;
    for (let i = 0; i < panelState.connections.length; i++) {
      const connection = panelState.connections[i];
      const fromPos = getNodePosition(
        connection.from.type,
        connection.from.index
      );
      const toPos = getNodePosition(connection.to.type, connection.to.index);
      const dist = distancePointToSegment(
        x,
        y,
        fromPos.x,
        fromPos.y,
        toPos.x,
        toPos.y
      );
      if (dist <= threshold) {
        foundIndex = i;
        break;
      }
    }
    if (foundIndex !== null) {
      if (hoveredWire !== foundIndex) {
        setHoveredWire(foundIndex);
      }
    } else if (hoveredWire !== null) {
      setHoveredWire(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!openPanel || engineeringState.isViewingSchematic) return;
    const { x, y } = getMousePosInCanvas(e);
    const panelState = engineeringState.panels[openPanel];
    const threshold = 8;
    for (let i = 0; i < panelState.connections.length; i++) {
      const connection = panelState.connections[i];
      const fromPos = getNodePosition(
        connection.from.type,
        connection.from.index
      );
      const toPos = getNodePosition(connection.to.type, connection.to.index);
      const dist = distancePointToSegment(
        x,
        y,
        fromPos.x,
        fromPos.y,
        toPos.x,
        toPos.y
      );
      if (dist <= threshold) {
        handleWireClick(i);
        break;
      }
    }
  };

  const getNodePosition = (
    type: "input" | "node" | "output",
    index: number
  ) => {
    const baseX =
      type === "input"
        ? 48
        : type === "node"
        ? PANEL_SIZE / 2
        : PANEL_SIZE - 48;
    const baseY = 76 + index * 48;
    return { x: baseX, y: baseY };
  };

  const renderClosedPanel = (panelName: string) => {
    if (!currentPlayer) return null;
    const penaltyInfo = getPanelPenaltyInfo(
      panelName,
      engineeringState,
      currentPlayer
    );
    const isSchematic = engineeringState.isViewingSchematic;

    return (
      <div
        key={panelName}
        onClick={() => handlePanelClick(panelName)}
        className={`${
          isSchematic ? "bg-yellow-100" : "bg-gray-600"
        } border-2 border-gray-400 rounded-lg p-8 cursor-pointer hover:${
          isSchematic ? "bg-yellow-200" : "bg-gray-500"
        } transition-colors relative`}
        style={{ height: `${253.2}px`, width: `${253.2}px` }}
      >
        {/* Corner screws */}
        <div className="absolute top-2 left-2 w-3 h-3 bg-gray-500 rounded-full border border-gray-700"></div>
        <div className="absolute top-2 right-2 w-3 h-3 bg-gray-500 rounded-full border border-gray-700"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 bg-gray-500 rounded-full border border-gray-700"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 bg-gray-500 rounded-full border border-gray-700"></div>

        {/* Panel name */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span
              className={`${
                isSchematic ? "text-gray-800" : "text-gray-800"
              } font-mono text-2xl font-bold block`}
            >
              {panelName}
            </span>
            {isSchematic && (
              <span className="text-gray-600 font-mono text-sm block mt-2">
                ({otherPlayer}'s Schematic)
              </span>
            )}
            {DEBUG_MODE ||
              (isSchematic && PANEL_SYSTEM_MAPPING[panelName] && (
                <span
                  className={`${
                    isSchematic ? "text-gray-600" : "text-gray-700"
                  } font-mono text-sm block mt-2`}
                >
                  ({PANEL_SYSTEM_MAPPING[panelName]})
                </span>
              ))}
            {DEBUG_MODE && !isSchematic && (
              <div className="mt-4">
                <div className="text-gray-800 font-mono text-xs">
                  Penalty: {penaltyInfo.multiplier}x
                </div>
                <div className="text-gray-800 font-mono text-xs">
                  Errors: {penaltyInfo.incorrectCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOpenPanel = (panelName: string) => {
    if (!currentPlayer) return null;
    const penaltyInfo = getPanelPenaltyInfo(
      panelName,
      engineeringState,
      currentPlayer
    );
    const isSchematic = engineeringState.isViewingSchematic;

    return (
      <div
        key={panelName}
        className={`${
          isSchematic ? "bg-yellow-50" : "bg-gray-700"
        } border-2 border-gray-500 rounded-lg relative`}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{ height: `${PANEL_SIZE}px`, width: `${PANEL_SIZE}px` }}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="text-center mx-auto">
              <h3
                className={`${
                  isSchematic ? "text-gray-800" : "text-white"
                } font-mono text-lg`}
              >
                {panelName}
              </h3>
              {isSchematic && (
                <span className="text-gray-600 font-mono text-sm block">
                  ({otherPlayer}'s Schematic)
                </span>
              )}
              {DEBUG_MODE && PANEL_SYSTEM_MAPPING[panelName] && (
                <span
                  className={`${
                    isSchematic ? "text-gray-600" : "text-gray-300"
                  } font-mono text-sm block`}
                >
                  ({PANEL_SYSTEM_MAPPING[panelName]})
                </span>
              )}
            </div>
          </div>

          {/* Debug penalty display in center */}
          {DEBUG_MODE && !isSchematic && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded pointer-events-none">
              <div className="text-white font-mono text-xs text-center">
                <div>Penalty: {penaltyInfo.multiplier}x</div>
                <div>Errors: {penaltyInfo.incorrectCount}</div>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={PANEL_SIZE}
            height={PANEL_SIZE}
            className="absolute inset-0"
            onMouseMove={(e) => handleCanvasMouseMove(e)}
            onClick={(e) => handleCanvasClick(e)}
          />

          {/* Input nodes */}
          <div className="absolute left-8 top-8">
            <div
              className={`${
                isSchematic ? "text-gray-700" : "text-white"
              } text-sm mb-2 text-center`}
            >
              IN
            </div>
            {COLORS.map((color, index) => (
              <div
                key={`input-${index}`}
                className={`w-8 h-8 rounded-full border-2 ${
                  isSchematic ? "border-gray-600" : "border-white"
                } mb-4 ${
                  !isSchematic
                    ? "cursor-pointer hover:scale-110"
                    : "cursor-default"
                } transition-transform`}
                style={{ backgroundColor: color }}
                onMouseDown={
                  !isSchematic
                    ? (e) => handleNodeMouseDown("input", index, e)
                    : undefined
                }
                onMouseUp={
                  !isSchematic
                    ? () => handleNodeMouseUp("input", index)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Center nodes */}
          <div className="absolute left-[50%] ml-[-16px] top-8">
            <div
              className={`${
                isSchematic ? "text-gray-700" : "text-white"
              } text-sm mb-2 text-center`}
            >
              V
            </div>
            {COLORS.map((color, index) => (
              <div
                key={`node-${index}`}
                className={`w-8 h-8 rounded-full border-2 ${
                  isSchematic ? "border-gray-600" : "border-white"
                } mb-4 ${
                  !isSchematic
                    ? "cursor-pointer hover:scale-110"
                    : "cursor-default"
                } transition-transform`}
                style={{ backgroundColor: color }}
                onMouseDown={
                  !isSchematic
                    ? (e) => handleNodeMouseDown("node", index, e)
                    : undefined
                }
                onMouseUp={
                  !isSchematic
                    ? () => handleNodeMouseUp("node", index)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Output nodes */}
          <div className="absolute right-8 top-8">
            <div
              className={`${
                isSchematic ? "text-gray-700" : "text-white"
              } text-sm mb-2 text-center`}
            >
              OUT
            </div>
            {COLORS.map((color, index) => (
              <div
                key={`output-${index}`}
                className={`w-8 h-8 rounded-full border-2 ${
                  isSchematic ? "border-gray-600" : "border-white"
                } mb-4 ${
                  !isSchematic
                    ? "cursor-pointer hover:scale-110"
                    : "cursor-default"
                } transition-transform`}
                style={{ backgroundColor: color }}
                onMouseDown={
                  !isSchematic
                    ? (e) => handleNodeMouseDown("output", index, e)
                    : undefined
                }
                onMouseUp={
                  !isSchematic
                    ? () => handleNodeMouseUp("output", index)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Draw wires on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !openPanel || !currentPlayer) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // In schematic view, show the correct connections for the other player
    // In normal view, show the current panel connections for this player
    const panelState = engineeringState.isViewingSchematic
      ? {
          connections:
            engineeringState.correctState[otherPlayer][openPanel].connections,
        }
      : engineeringState.panels[openPanel];

    // Draw existing connections
    panelState.connections.forEach((connection, index) => {
      const fromPos = getNodePosition(
        connection.from.type,
        connection.from.index
      );
      const toPos = getNodePosition(connection.to.type, connection.to.index);

      ctx.strokeStyle = hoveredWire === index ? "#fbbf24" : "#9ca3af";
      ctx.lineWidth = hoveredWire === index ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.lineTo(toPos.x, toPos.y);
      ctx.stroke();

      // Make wire clickable by drawing invisible thick line
      ctx.strokeStyle = "transparent";
      ctx.lineWidth = 10;
      ctx.stroke();
    });

    // Draw dragging wire
    if (dragState.isDragging && dragState.from) {
      const fromPos = getNodePosition(
        dragState.from.type,
        dragState.from.index
      );
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.lineTo(dragState.mousePos.x, dragState.mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    openPanel,
    engineeringState,
    dragState,
    hoveredWire,
    currentPlayer,
    otherPlayer,
  ]);

  return (
    <div className="bg-gray-800 p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-mono">Engineering Station</h2>
        <button
          onClick={handleSchematicToggle}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm rounded transition-colors"
        >
          {engineeringState.isViewingSchematic
            ? "Back to My Panels"
            : `${otherPlayer} Schematic`}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {engineeringState.panelOrder.map((panelName) =>
          panelName === openPanel
            ? renderOpenPanel(panelName)
            : renderClosedPanel(panelName)
        )}
      </div>
    </div>
  );
};
