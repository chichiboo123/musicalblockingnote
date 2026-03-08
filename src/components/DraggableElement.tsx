import React from "react";

interface DraggableElementProps {
  id: string;
  type: "character" | "path" | "custom";
  svg?: string;
  color?: string;
  label?: string;
  children: React.ReactNode;
}

const DraggableElement = ({ id, type, svg, color, label, children }: DraggableElementProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    const data = JSON.stringify({ id, type, svg, color, label });
    e.dataTransfer.setData("application/json", data);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="draggable-element inline-flex items-center gap-1 p-1 rounded cursor-grab"
      title={label || id}
    >
      {children}
    </div>
  );
};

export default DraggableElement;
