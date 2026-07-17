import React, { useState, useRef, useEffect } from "react";
import { X, PanelRightClose, PanelRightOpen, Trash2, Edit2, Check } from "lucide-react";

interface PanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onClearChat: () => void;
  title: string;
  onRenameTitle: (newTitle: string) => void;
  children: React.ReactNode;
}

export function TutorPanel({
  isOpen,
  onToggle,
  onClearChat,
  title,
  onRenameTitle,
  children,
}: PanelProps) {
  const [width, setWidth] = useState(400); // Default desktop width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startEditing = () => {
    setEditTitle(title);
    setIsEditing(true);
  };

  // Handle drag resizing
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      // Impose limits on resizing (min 320px, max 60% of viewport)
      if (newWidth > 320 && newWidth < window.innerWidth * 0.6) {
        setWidth(newWidth);
        // Set CSS custom property on document to offset main container padding
        document.documentElement.style.setProperty("--tutor-width", `${newWidth}px`);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Reset custom property when panel is closed
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.setProperty("--tutor-width", `${width}px`);
    } else {
      document.documentElement.style.setProperty("--tutor-width", "0px");
    }
  }, [isOpen, width]);

  const handleRenameSubmit = () => {
    if (editTitle.trim() && editTitle !== title) {
      onRenameTitle(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <>
      {/* Floating Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-6 bottom-6 z-40 bg-gradient-to-br from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold p-4 rounded-full shadow-xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer no-print"
          title="Open AI Tutor"
        >
          <span className="text-sm font-semibold tracking-wide">AI Tutor</span>
          <PanelRightOpen className="w-5 h-5" />
        </button>
      )}

      {/* Main Panel Wrapper */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-screen z-40 bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col transition-all duration-300 ease-out no-print ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: isOpen ? (window.innerWidth < 768 ? "100%" : `${width}px`) : "0px",
        }}
      >
        {/* Resize handle (Desktop only) */}
        {isOpen && window.innerWidth >= 768 && (
          <div
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize hover:bg-blue-500/30 active:bg-blue-500 transition-colors z-50"
          />
        )}

        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4 select-none">
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            {isEditing ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
                  className="w-full text-sm font-semibold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleRenameSubmit}
                  className="p-1 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0 group">
                <h2
                  className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {title}
                </h2>
                <button
                  onClick={startEditing}
                  className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename session"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClearChat}
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onToggle}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              title="Collapse tutor"
            >
              {window.innerWidth < 768 ? <X className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Panel Content (Chat Body + Smart Action Chips + Inputs) */}
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </>
  );
}
