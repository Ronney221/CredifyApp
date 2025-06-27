// Empty shim for Node.js modules not available in React Native
const createErrorMethod = (methodName) => (...args) => {
  console.warn(`Attempted to call ${methodName} which is not available in React Native`);
  return null;
};

const createErrorClass = (className) => {
  return class {
    constructor() {
      console.warn(`Attempted to instantiate ${className} which is not available in React Native`);
    }
  };
};

// Common methods that might be called
const commonMethods = {
  read: createErrorMethod('read'),
  write: createErrorMethod('write'),
  connect: createErrorMethod('connect'),
  end: createErrorMethod('end'),
  destroy: createErrorMethod('destroy'),
  on: createErrorMethod('on'),
  once: createErrorMethod('once'),
  emit: createErrorMethod('emit'),
  removeListener: createErrorMethod('removeListener'),
  pipe: createErrorMethod('pipe'),
};

// Export a proxy that catches all property access
module.exports = new Proxy({}, {
  get: (target, prop) => {
    if (prop in commonMethods) {
      return commonMethods[prop];
    }
    if (typeof prop === 'string' && /^[A-Z]/.test(prop)) {
      // Likely a class name
      return createErrorClass(prop);
    }
    return createErrorMethod(prop.toString());
  }
}); 