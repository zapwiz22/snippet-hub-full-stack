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
      if (timeSinceUserInput < 500) {
        console.log(
          "Skipping remote textarea change due to recent user input:",
          timeSinceUserInput
        );
        return;
      }

      lastRemoteChange.current = remoteChanges;

      if (remoteChanges.value !== localValue) {
        isUpdatingFromRemote.current = true;

        setLocalValue(remoteChanges.value);
        onChange(remoteChanges.value);

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
