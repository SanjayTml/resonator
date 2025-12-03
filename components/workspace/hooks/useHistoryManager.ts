import { useCallback, useState } from 'react';
import { VisualizerElement } from '../../../types';

interface HistoryManager {
  elements: VisualizerElement[];
  setElements: React.Dispatch<React.SetStateAction<VisualizerElement[]>>;
  pushHistory: (nextElements: VisualizerElement[]) => void;
  undo: () => void;
  redo: () => void;
  historyLength: number;
  redoStackLength: number;
}

const useHistoryManager = (initialElements: VisualizerElement[] = []): HistoryManager => {
  const [elements, setElements] = useState<VisualizerElement[]>(initialElements);
  const [history, setHistory] = useState<VisualizerElement[][]>([]);
  const [redoStack, setRedoStack] = useState<VisualizerElement[][]>([]);

  const pushHistory = useCallback(
    (nextElements: VisualizerElement[]) => {
      setHistory(prev => [...prev, elements]);
      setRedoStack([]);
      setElements(nextElements);
    },
    [elements]
  );

  const undo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const previous = prevHistory[prevHistory.length - 1];
      setRedoStack(prevRedo => [elements, ...prevRedo]);
      setElements(previous);
      return prevHistory.slice(0, prevHistory.length - 1);
    });
  }, [elements]);

  const redo = useCallback(() => {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[0];
      setHistory(prevHistory => [...prevHistory, elements]);
      setElements(next);
      return prevRedo.slice(1);
    });
  }, [elements]);

  return {
    elements,
    setElements,
    pushHistory,
    undo,
    redo,
    historyLength: history.length,
    redoStackLength: redoStack.length
  };
};

export default useHistoryManager;
