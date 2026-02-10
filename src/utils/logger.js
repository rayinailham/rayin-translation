const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';

export const logger = {
  log: (msg, ...args) => {
    if (isDebug) {
      console.log(`[DEBUG] ${msg}`, ...args);
    }
  },
  info: (msg, ...args) => {
    if (isDebug) {
        console.info(`[DEBUG INFO] ${msg}`, ...args);
    }
  },
  warn: (msg, ...args) => {
    if (isDebug) {
        console.warn(`[DEBUG WARN] ${msg}`, ...args);
    }
  },
  error: (msg, ...args) => {
    if (isDebug) {
        console.error(`[DEBUG ERROR] ${msg}`, ...args);
    }
  },
  
  // Specific activity loggers
  translation: (action, details) => logActivity('TRANSLATION', action, details),
  preset: (action, details) => logActivity('PRESET', action, details),
  novel: (action, details) => logActivity('NOVEL', action, details),
  chapter: (action, details) => logActivity('CHAPTER', action, details),
  fetch: (action, details) => logActivity('FETCH', action, details),
  system: (action, details) => logActivity('SYSTEM', action, details),
};

function logActivity(category, action, details) {
  if (!isDebug) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const style = 'color: #7c3aed; font-weight: bold;'; // Violet color for debug logs
  const categoryStyle = 'background: #7c3aed; color: white; padding: 2px 4px; border-radius: 2px;';
  
  console.groupCollapsed(`%c${category}%c ${action} @ ${timestamp}`, categoryStyle, style);
  if (details) {
    console.log('Details:', details);
  }
  console.groupEnd();
}

export default logger;
