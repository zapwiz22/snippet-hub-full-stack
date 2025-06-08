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
    maxQueueSize = 15,
    batchDelay = 20, // Even faster processing
    deduplicationKey = (item) => `${item.field}-${item.timestamp}`,
  } = options;

  let queue = [];
  let processing = false;
  let processTimeout;

  const processQueue = () => {
    if (processing || queue.length === 0) return;

    processing = true;

    // More conservative deduplication - only dedupe if values are identical and very close in time
    const deduped = queue.reduce((acc, item) => {
      const key = item.field;
      const existing = acc[key];

      // Only deduplicate if:
      // 1. Same field
      // 2. Same value
      // 3. Within 25ms (very short window)
      if (
        !existing ||
        item.value !== existing.value ||
        item.timestamp - existing.timestamp > 25
      ) {
        acc[key] = item;
      }
      return acc;
    }, {});

    const toProcess = Object.values(deduped);
    queue = [];

    // Process items with minimal delay
    toProcess.forEach((item, index) => {
      setTimeout(() => {
        processor(item);
        if (index === toProcess.length - 1) {
          processing = false;
          // Check for more items immediately
          if (queue.length > 0) {
            setTimeout(processQueue, batchDelay);
          }
        }
      }, index * 5); // Very short delay between processing items
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
