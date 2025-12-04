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

export const findParentElement = (
  list: VisualizerElement[],
  id: string,
  parent?: VisualizerElement
): VisualizerElement | undefined => {
  for (const el of list) {
    if (el.id === id) return parent;
    if (el.children) {
      const found = findParentElement(el.children, id, el);
      if (found) return found;
    }
  }
  return undefined;
};

export const findNearestGroupAncestor = (
  list: VisualizerElement[],
  id: string
): VisualizerElement | undefined => {
  const parent = findParentElement(list, id);
  if (!parent) return undefined;
  if (parent.type === 'group') return parent;
  return findNearestGroupAncestor(list, parent.id);
};

export const findGroupAncestors = (
  list: VisualizerElement[],
  id: string
): VisualizerElement[] => {
  const ancestors: VisualizerElement[] = [];
  const recurse = (currentId: string) => {
    const parent = findParentElement(list, currentId);
    if (!parent) return;
    if (parent.type === 'group') ancestors.push(parent);
    recurse(parent.id);
  };
  recurse(id);
  return ancestors;
};

export const isDescendantOfGroup = (
  list: VisualizerElement[],
  groupId: string,
  targetId: string
): boolean => {
  if (groupId === targetId) return true;
  const group = findElementById(groupId, list);
  if (!group || !group.children) return false;
  const search = (children: VisualizerElement[]): boolean => {
    for (const child of children) {
      if (child.id === targetId) return true;
      if (child.children && search(child.children)) return true;
    }
    return false;
  };
  return search(group.children);
};

export const findElementPath = (
  list: VisualizerElement[],
  id: string,
  currentPath: number[] = []
): number[] | null => {
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    const path = [...currentPath, i];
    if (el.id === id) return path;
    if (el.children) {
      const childPath = findElementPath(el.children, id, path);
      if (childPath) return childPath;
    }
  }
  return null;
};

const pathsEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
};

const getChildrenAtPath = (list: VisualizerElement[], path: number[]): VisualizerElement[] => {
  if (path.length === 0) return list;
  let current: VisualizerElement[] = list;
  for (const index of path) {
    const parent = current[index];
    if (!parent) return [];
    current = parent.children ? [...parent.children] : [];
  }
  return current;
};

const updateChildrenAtPath = (
  list: VisualizerElement[],
  path: number[],
  updater: (children: VisualizerElement[]) => VisualizerElement[]
): VisualizerElement[] => {
  if (path.length === 0) {
    return updater(list);
  }

  const [head, ...rest] = path;
  return list.map((el, idx) => {
    if (idx !== head) return el;
    const children = el.children ? [...el.children] : [];
    const updatedChildren = updateChildrenAtPath(children, rest, updater);
    return { ...el, children: updatedChildren };
  });
};

const removeElementAtPath = (
  list: VisualizerElement[],
  path: number[]
): { list: VisualizerElement[]; removed?: VisualizerElement } => {
  if (path.length === 0) return { list };
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  let removed: VisualizerElement | undefined;

  const newList = updateChildrenAtPath(list, parentPath, (children) => {
    if (index < 0 || index >= children.length) return children;
    removed = children[index];
    const next = [...children];
    next.splice(index, 1);
    return next;
  });

  return { list: newList, removed };
};

const insertElementAtPath = (
  list: VisualizerElement[],
  parentPath: number[],
  index: number,
  element: VisualizerElement
): VisualizerElement[] => {
  return updateChildrenAtPath(list, parentPath, (children) => {
    const next = [...children];
    const clampedIndex = Math.max(0, Math.min(index, next.length));
    next.splice(clampedIndex, 0, element);
    return next;
  });
};

const moveElementToIndex = (
  list: VisualizerElement[],
  currentPath: number[],
  parentPath: number[],
  targetIndex: number
): VisualizerElement[] => {
  const { list: withoutElement, removed } = removeElementAtPath(list, currentPath);
  if (!removed) return list;
  const siblingsAfter = getChildrenAtPath(withoutElement, parentPath);
  const clampedIndex = Math.max(0, Math.min(targetIndex, siblingsAfter.length));
  return insertElementAtPath(withoutElement, parentPath, clampedIndex, removed);
};

export const moveElementRelative = (
  list: VisualizerElement[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after'
): VisualizerElement[] => {
  if (sourceId === targetId) return list;
  const sourcePath = findElementPath(list, sourceId);
  const targetPath = findElementPath(list, targetId);
  if (!sourcePath || !targetPath) return list;

  const sourceParent = sourcePath.slice(0, -1);
  const targetParent = targetPath.slice(0, -1);
  if (!pathsEqual(sourceParent, targetParent)) return list;

  const { list: withoutSource, removed } = removeElementAtPath(list, sourcePath);
  if (!removed) return list;

  const updatedTargetPath = findElementPath(withoutSource, targetId);
  if (!updatedTargetPath) return list;

  const insertIndex =
    updatedTargetPath[updatedTargetPath.length - 1] + (position === 'after' ? 1 : 0);

  return insertElementAtPath(withoutSource, sourceParent, insertIndex, removed);
};

export type LayerShift = 'front' | 'back' | 'forward' | 'backward';

export const changeElementLayer = (
  list: VisualizerElement[],
  id: string,
  direction: LayerShift
): VisualizerElement[] => {
  const path = findElementPath(list, id);
  if (!path) return list;
  const parentPath = path.slice(0, -1);
  const siblings = getChildrenAtPath(list, parentPath);
  if (siblings.length <= 1) return list;

  const currentIndex = path[path.length - 1];
  let targetIndex = currentIndex;

  switch (direction) {
    case 'front':
      targetIndex = siblings.length - 1;
      break;
    case 'back':
      targetIndex = 0;
      break;
    case 'forward':
      targetIndex = Math.min(siblings.length - 1, currentIndex + 1);
      break;
    case 'backward':
      targetIndex = Math.max(0, currentIndex - 1);
      break;
  }

  if (targetIndex === currentIndex) return list;
  return moveElementToIndex(list, path, parentPath, targetIndex);
};
