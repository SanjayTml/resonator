import { VisualizerElement } from '../../types';

export const findElementById = (
  id: string,
  list: VisualizerElement[]
): VisualizerElement | undefined => {
  for (const el of list) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElementById(id, el.children);
      if (found) return found;
    }
  }
  return undefined;
};

export const updateElementInList = (
  list: VisualizerElement[],
  id: string,
  updates: Partial<VisualizerElement>
): VisualizerElement[] => {
  return list.map(el => {
    if (el.id === id) return { ...el, ...updates };
    if (el.children) return { ...el, children: updateElementInList(el.children, id, updates) };
    return el;
  });
};

export const removeElementFromList = (
  list: VisualizerElement[],
  id: string
): VisualizerElement[] => {
  return list
    .filter(el => el.id !== id)
    .map(el => {
      if (el.children) return { ...el, children: removeElementFromList(el.children, id) };
      return el;
    });
};
