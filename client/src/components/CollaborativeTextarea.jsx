import React, { useEffect, useRef, useState } from "react";

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
  const lastUserInput = useRef(Date.now());
  const ignoreNextRemoteChange = useRef(false);

  // Update local value when prop value changes
  useEffect(() => {
    if (!isUpdatingFromRemote.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Simplified remote changes handling - just replace the whole content
  useEffect(() => {
    if (remoteChanges && remoteChanges.field === field) {
      // Skip duplicate changes
      if (
        lastRemoteChange.current &&
        lastRemoteChange.current.timestamp === remoteChanges.timestamp
      ) {
        return;
      }

      // Skip if user recently typed (avoid conflicts)
      if (ignoreNextRemoteChange.current) {
        ignoreNextRemoteChange.current = false;
        return;
      }

      const timeSinceUserInput = Date.now() - lastUserInput.current;
      if (timeSinceUserInput < 200) {
        console.log(
          "Skipping remote textarea change due to recent user input:",
          timeSinceUserInput
        );
        return;
      }

      lastRemoteChange.current = remoteChanges;

      // Only apply if the value is actually different
      if (remoteChanges.value !== localValue) {
        isUpdatingFromRemote.current = true;

        // Simply replace the entire content - much simpler!
        setLocalValue(remoteChanges.value);
        onChange(remoteChanges.value);

        // Reset the update flag immediately
        isUpdatingFromRemote.current = false;
      }
    }
  }, [remoteChanges, field, onChange, localValue]);

  const handleChange = (e) => {
    if (isUpdatingFromRemote.current) return;

    lastUserInput.current = Date.now();

    // Mark that we should ignore the next remote change to avoid echo
    ignoreNextRemoteChange.current = true;

    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

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
