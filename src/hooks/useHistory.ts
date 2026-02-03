import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry } from '@/api/types';

const HISTORY_STORAGE_KEY = 'facefair-history';
const MAX_HISTORY_ITEMS = 100;

/**
 * Custom hook for managing analysis history
 * 
 * Storage Note:
 * LocalStorage for demo purposes, upgradeable to Firebase Firestore for production.
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryEntry[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    }
  }, [history, isLoading]);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    setHistory((prev) => {
      const updated = [newEntry, ...prev];
      // Keep only the most recent items
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });

    return newEntry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getEntryById = useCallback((id: string) => {
    return history.find((entry) => entry.id === id);
  }, [history]);

  const filterByType = useCallback((type: HistoryEntry['type']) => {
    return history.filter((entry) => entry.type === type);
  }, [history]);

  return {
    history,
    isLoading,
    addEntry,
    removeEntry,
    clearHistory,
    getEntryById,
    filterByType,
  };
}
