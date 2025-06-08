import React, { useEffect, useRef, useState } from "react";
import {
  calculateCursorAdjustment,
  isSignificantChange,
} from "../utils/textDiff";

const CollaborativeTextarea = ({
  value,
  onChange,
  onCursorChange,
  remoteChanges,
  activeUsers,
  field,
  placeholder,
  rows = 4,
  className = "",
  ...props
}) => {
  const textareaRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const [cursorPosition, setCursorPosition] = useState(0);
  const isUpdatingFromRemote = useRef(false);
  const lastRemoteChange = useRef(null);
  const updateTimeoutRef = useRef(null);
  const lastUserInput = useRef(Date.now());
  const ignoreNextRemoteChange = useRef(false);

  // Update local value when prop value changes
  useEffect(() => {
    if (!isUpdatingFromRemote.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Enhanced remote changes handling with differential updates
  useEffect(() => {
    if (remoteChanges && remoteChanges.field === field) {
      if (
        lastRemoteChange.current &&
        lastRemoteChange.current.timestamp === remoteChanges.timestamp
      ) {
        return;
      }

      if (ignoreNextRemoteChange.current) {
        ignoreNextRemoteChange.current = false;
        return;
      }

      const timeSinceUserInput = Date.now() - lastUserInput.current;
      if (timeSinceUserInput < 50) {
        // Reduced from 150 for faster updates
        console.log(
          "Skipping remote textarea change due to recent user input:",
          timeSinceUserInput
        );
        return;
      }

      lastRemoteChange.current = remoteChanges;
      isUpdatingFromRemote.current = true;

      const textarea = textareaRef.current;
      const currentCursor = textarea ? textarea.selectionStart : 0;
      const currentSelection = textarea
        ? textarea.selectionEnd - textarea.selectionStart
        : 0;

      // Clear any pending update
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      if (remoteChanges.value !== localValue) {
        let adjustedCursor = calculateCursorAdjustment(
          localValue,
          remoteChanges.value,
          currentCursor
        );

        const oldLines = localValue.substr(0, currentCursor).split("\n");
        const oldLineNumber = oldLines.length - 1;
        const oldColumnNumber = oldLines[oldLines.length - 1].length;

        const newLines = remoteChanges.value.split("\n");

        if (newLines.length > oldLineNumber) {
          const targetLine = Math.min(oldLineNumber, newLines.length - 1);
          const targetColumn = Math.min(
            oldColumnNumber,
            newLines[targetLine].length
          );

          const lineBasedCursor =
            newLines.slice(0, targetLine).join("\n").length +
            (targetLine > 0 ? 1 : 0) +
            targetColumn;

          // Use the better of the two positioning methods
          const cursorDiffFromCalc = Math.abs(adjustedCursor - currentCursor);
          const cursorDiffFromLine = Math.abs(lineBasedCursor - currentCursor);

          if (cursorDiffFromLine < cursorDiffFromCalc) {
            adjustedCursor = lineBasedCursor;
          }
        }

        adjustedCursor = Math.max(
          0,
          Math.min(adjustedCursor, remoteChanges.value.length)
        );

        // Apply update immediately without delay for better real-time feel
        setLocalValue(remoteChanges.value);
        onChange(remoteChanges.value);

        // Immediate cursor adjustment
        requestAnimationFrame(() => {
          if (textarea && isUpdatingFromRemote.current) {
            try {
              if (currentSelection > 0) {
                const adjustedSelectionEnd = Math.min(
                  adjustedCursor + currentSelection,
                  remoteChanges.value.length
                );
                textarea.setSelectionRange(
                  adjustedCursor,
                  adjustedSelectionEnd
                );
              } else {
                textarea.setSelectionRange(adjustedCursor, adjustedCursor);
              }
              setCursorPosition(adjustedCursor);
            } catch (e) {
              const safePosition = Math.min(
                adjustedCursor,
                remoteChanges.value.length
              );
              textarea.setSelectionRange(safePosition, safePosition);
              setCursorPosition(safePosition);
            }
          }
          isUpdatingFromRemote.current = false;
        });
      } else {
        isUpdatingFromRemote.current = false;
      }
    }
  }, [remoteChanges, field, onChange, localValue]);

  const handleChange = (e) => {
    if (isUpdatingFromRemote.current) return;

    lastUserInput.current = Date.now();

    ignoreNextRemoteChange.current = true;

    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const handleCursorChange = () => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart;
      setCursorPosition(position);
      if (onCursorChange) {
        onCursorChange(field, position);
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      onSelect={handleCursorChange}
      onKeyUp={handleCursorChange}
      onClick={handleCursorChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      {...props}
    />
  );
};

export default CollaborativeTextarea;
