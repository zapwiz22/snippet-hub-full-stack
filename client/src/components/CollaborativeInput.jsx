import React, { useEffect, useRef, useState } from "react";
import {
  calculateCursorAdjustment,
  isSignificantChange,
} from "../utils/textDiff";

const CollaborativeInput = ({
  value,
  onChange,
  onCursorChange,
  remoteChanges,
  activeUsers,
  field,
  placeholder,
  type = "text",
  className = "",
  ...props
}) => {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
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

  // Enhanced remote changes handling with stable updates
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
      if (timeSinceUserInput < 150) {
        console.log(
          "Skipping remote change due to recent user input:",
          timeSinceUserInput
        );
        return;
      }

      lastRemoteChange.current = remoteChanges;

      // Only apply if the value is actually different
      if (remoteChanges.value !== localValue) {
        isUpdatingFromRemote.current = true;

        const input = inputRef.current;
        const shouldPreserveCursor = input && document.activeElement === input;
        const currentCursor = shouldPreserveCursor ? input.selectionStart : 0;
        const currentSelection = shouldPreserveCursor
          ? input.selectionEnd - input.selectionStart
          : 0;

        // Clear any pending update to prevent conflicts
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // Calculate cursor adjustment before applying changes
        const adjustedCursor = shouldPreserveCursor
          ? calculateCursorAdjustment(
              localValue,
              remoteChanges.value,
              currentCursor
            )
          : 0;

        // Apply changes immediately but restore cursor after DOM update
        setLocalValue(remoteChanges.value);
        onChange(remoteChanges.value);

        // Only restore cursor if input is focused and we need to preserve position
        if (shouldPreserveCursor) {
          // Use a single requestAnimationFrame for cursor restoration
          requestAnimationFrame(() => {
            if (
              input &&
              document.activeElement === input &&
              isUpdatingFromRemote.current
            ) {
              try {
                const safePosition = Math.max(
                  0,
                  Math.min(adjustedCursor, remoteChanges.value.length)
                );
                if (currentSelection > 0) {
                  const adjustedSelectionEnd = Math.min(
                    safePosition + currentSelection,
                    remoteChanges.value.length
                  );
                  input.setSelectionRange(safePosition, adjustedSelectionEnd);
                } else {
                  input.setSelectionRange(safePosition, safePosition);
                }
              } catch (e) {
                console.log("Error: ",e);
              }
            }
            isUpdatingFromRemote.current = false;
          });
        } else {
          isUpdatingFromRemote.current = false;
        }
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
    if (inputRef.current) {
      const position = inputRef.current.selectionStart;
      if (onCursorChange) {
        onCursorChange(field, position);
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      onChange={handleChange}
      onSelect={handleCursorChange}
      onKeyUp={handleCursorChange}
      onClick={handleCursorChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
};

export default CollaborativeInput;
