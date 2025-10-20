import { useState, useRef, useCallback } from 'react';

export const useDragAndDrop = (items, onReorder) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const handleDragStart = useCallback((e, index) => {
    setDraggedItem(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // Add visual feedback
    if (e.target) {
      e.target.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e) => {
    // Reset visual feedback
    if (e.target) {
      e.target.style.opacity = '1';
    }
    
    setDraggedItem(null);
    setDragOverIndex(null);
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // Create new array with reordered items
    const newItems = [...items];
    const draggedItemData = newItems[draggedItem];
    
    // Remove the dragged item
    newItems.splice(draggedItem, 1);
    
    // Insert at new position
    newItems.splice(dropIndex, 0, draggedItemData);
    
    // Call the reorder callback
    onReorder(newItems);
    
    setDragOverIndex(null);
  }, [draggedItem, items, onReorder]);

  return {
    draggedItem,
    dragOverIndex,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    dragRef
  };
};
