/**
 * Performance optimization utilities for React Native components
 * Implements FlatList optimizations and other performance enhancements
 */

import { ListRenderItemInfo } from 'react-native';

// Constants for FlatList performance optimization
export const PERFORMANCE_CONFIGS = {
  // Card list optimizations
  CARD_LIST: {
    ESTIMATED_ITEM_HEIGHT: 109, // Updated from plan - collapsed card height
    EXPANDED_ITEM_HEIGHT: 555,  // Updated from plan - expanded card height
    MAX_TO_RENDER_PER_BATCH: 5,
    WINDOW_SIZE: 10,
    INITIAL_NUM_TO_RENDER: 3,
    UPDATE_CELLS_BATCH_PERIOD: 50,
    REMOVE_CLIPPED_SUBVIEWS: true,
    GET_ITEM_LAYOUT: (data: any, index: number) => ({
      length: PERFORMANCE_CONFIGS.CARD_LIST.ESTIMATED_ITEM_HEIGHT,
      offset: PERFORMANCE_CONFIGS.CARD_LIST.ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
  },
  
  // Perk list optimizations (for smaller lists)
  PERK_LIST: {
    ESTIMATED_ITEM_HEIGHT: 60,
    MAX_TO_RENDER_PER_BATCH: 10,
    WINDOW_SIZE: 15,
    INITIAL_NUM_TO_RENDER: 8,
    UPDATE_CELLS_BATCH_PERIOD: 50,
    REMOVE_CLIPPED_SUBVIEWS: false, // Don't remove for smaller lists
  }
};

/**
 * Optimized keyExtractor functions to prevent unnecessary re-renders
 */
export const keyExtractors = {
  cardList: (item: { card: { id: string } }) => item.card.id,
  perkList: (item: { id: string }) => item.id,
  simpleList: (item: any, index: number) => item.id || index.toString(),
};

/**
 * Memoized comparison functions for FlatList extraData optimization
 */
export const compareArrays = <T>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

export const compareObjects = <T extends Record<string, any>>(a: T, b: T): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
};

/**
 * Debounced state update utility to prevent excessive re-renders
 */
export class DebouncedUpdater<T> {
  private timeout: NodeJS.Timeout | null = null;
  private delay: number;

  constructor(delay: number = 100) {
    this.delay = delay;
  }

  update(callback: () => void): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    this.timeout = setTimeout(() => {
      callback();
      this.timeout = null;
    }, this.delay);
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * Image optimization utilities
 */
export const ImageOptimization = {
  // Lazy loading placeholder component
  PLACEHOLDER_COLOR: '#f0f0f0',
  
  // Image caching configuration for expo-image
  getCacheConfig: () => ({
    cachePolicy: 'memory-disk' as const,
    priority: 'normal' as const,
    recyclingKey: undefined,
  }),
  
  // Optimized image props for card images
  getCardImageProps: () => ({
    style: { width: 60, height: 38 },
    contentFit: 'contain' as const,
    transition: 200,
    ...ImageOptimization.getCacheConfig(),
  }),
};

/**
 * Memory management utilities
 */
export const MemoryManager = {
  // Clear sensitive data from memory
  clearSensitiveData: (obj: any): void => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret')) {
          delete obj[key];
        }
      });
    }
  },

  // Cleanup function for component unmount
  cleanup: (refs: React.RefObject<any>[]): void => {
    refs.forEach(ref => {
      if (ref.current) {
        ref.current = null;
      }
    });
  },
};

/**
 * Animation performance utilities
 */
export const AnimationOptimization = {
  // Optimized Lottie animation props
  getLottieProps: () => ({
    renderMode: 'HARDWARE' as const,
    speed: 0.7,
    hardwareAccelerationAndroid: true,
    resizeMode: 'contain' as const,
  }),

  // Reanimated optimization
  NATIVE_DRIVER_CONFIG: {
    useNativeDriver: true,
  },
  
  // Layout animation configuration for better performance
  LAYOUT_ANIMATION_CONFIG: {
    duration: 200,
    create: {
      type: 'easeInEaseOut' as const,
      property: 'opacity' as const,
    },
    update: {
      type: 'easeInEaseOut' as const,
    },
  },
};

/**
 * Bundle size optimization utilities
 */
export const BundleOptimization = {
  // Conditional imports for heavy dependencies
  dynamicImport: async <T>(importFn: () => Promise<T>): Promise<T> => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic import failed:', error);
      throw error;
    }
  },

  // Lazy component wrapper
  createLazyComponent: <T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>
  ): React.LazyExoticComponent<T> => {
    return React.lazy(importFn);
  },
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static start(label: string): void {
    this.timers.set(label, Date.now());
  }

  static end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Performance timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    if (__DEV__ && duration > 100) {
      console.warn(`⚠️ Performance warning: ${label} took ${duration}ms`);
    }

    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }
}

// Re-export React for dynamic imports
import React from 'react';
export { React };