import React, { useEffect, useRef, useState } from "react";

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
          "Skipping remote change due to recent user input:",
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
    if (inputRef.current && onCursorChange) {
      const position = inputRef.current.selectionStart;
      onCursorChange(field, position);
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
