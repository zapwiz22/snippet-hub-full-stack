export const calculateCursorAdjustment = (oldText, newText, currentCursor) => {
  if (oldText === newText) return currentCursor;

  let prefixLength = 0;
  let suffixLength = 0;

  const minLength = Math.min(oldText.length, newText.length);

  while (
    prefixLength < minLength &&
    oldText[prefixLength] === newText[prefixLength]
  ) {
    prefixLength++;
  }

  while (
    suffixLength < minLength - prefixLength &&
    oldText[oldText.length - 1 - suffixLength] ===
      newText[newText.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  if (currentCursor <= prefixLength) {
    return currentCursor;
  }

  if (currentCursor >= oldText.length - suffixLength) {
    const lengthDiff = newText.length - oldText.length;
    return currentCursor + lengthDiff;
  }

  const changedRegionStart = prefixLength;
  const changedRegionEnd = oldText.length - suffixLength;
  const relativePosition =
    (currentCursor - changedRegionStart) /
    (changedRegionEnd - changedRegionStart);

  const newChangedRegionLength = newText.length - prefixLength - suffixLength;
  const adjustedPosition =
    prefixLength + Math.round(newChangedRegionLength * relativePosition);

  return Math.max(
    prefixLength,
    Math.min(adjustedPosition, newText.length - suffixLength)
  );
};

export const isSignificantChange = (oldText, newText) => {
  if (oldText === newText) return false;

  // Consider any change significant for real-time collaboration
  // Small changes like single characters, spaces, etc. should be synced
  return true;
};

export const createTextDebouncer = (callback, delay = 100) => {
  let timeoutId;
  let lastCall = 0;
  let pendingCall = null;

  return function (...args) {
    const now = Date.now();

    // Store the latest call arguments
    pendingCall = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // For very fast typing, execute immediately if enough time has passed
    if (now - lastCall > delay * 3) {
      lastCall = now;
      callback.apply(this, args);
      pendingCall = null;
      return;
    }

    // Otherwise, debounce with shorter delay for smoother typing
    timeoutId = setTimeout(() => {
      lastCall = Date.now();
      if (pendingCall) {
        callback.apply(this, pendingCall);
        pendingCall = null;
      }
    }, delay);
  };
};

export const createChangeQueue = (processor, options = {}) => {
  const {
    maxQueueSize = 10, // Reduced queue size for faster processing
    batchDelay = 5, // Immediate processing
    deduplicationKey = (item) => `${item.field}-${item.timestamp}`,
  } = options;

  let queue = [];
  let processing = false;
  let processTimeout;

  const processQueue = () => {
    if (processing || queue.length === 0) return;

    processing = true;

    // Simplified deduplication - only keep the latest change per field
    const deduped = queue.reduce((acc, item) => {
      const key = item.field;
      const existing = acc[key];

      // Only keep the latest change per field
      if (!existing || item.timestamp > existing.timestamp) {
        acc[key] = item;
      }
      return acc;
    }, {});

    const toProcess = Object.values(deduped);
    queue = [];

    // Process items immediately
    toProcess.forEach((item, index) => {
      setTimeout(() => {
        processor(item);
        if (index === toProcess.length - 1) {
          processing = false;
          // Check for more items immediately
          if (queue.length > 0) {
            processQueue();
          }
        }
      }, index * 2); // Minimal delay between processing items
    });
  };

  return {
    add: (item) => {
      queue.push(item);

      if (queue.length > maxQueueSize) {
        queue = queue.slice(-maxQueueSize);
      }

      if (processTimeout) clearTimeout(processTimeout);
      processTimeout = setTimeout(processQueue, batchDelay);
    },

    clear: () => {
      queue = [];
      if (processTimeout) clearTimeout(processTimeout);
    },
  };
};
