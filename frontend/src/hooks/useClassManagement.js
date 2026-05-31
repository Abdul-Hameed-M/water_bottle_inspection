import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_DETECTION_CLASSES } from '../constants/detectionClasses';

export const useClassManagement = () => {
  const [classes, setClasses] = useLocalStorage('seewise_detection_classes', DEFAULT_DETECTION_CLASSES);
  const [loading, setLoading] = useState(false);

  // Add a new class
  const addClass = (classData) => {
    const newClass = {
      id: classData.id || `class_${Date.now()}`,
      name: classData.name,
      displayName: classData.displayName || classData.name,
      color: classData.color || '#3B82F6',
      enabled: classData.enabled !== undefined ? classData.enabled : true,
      confidenceThreshold: classData.confidenceThreshold || 0.50,
      category: classData.category || 'object'
    };

    setClasses([...classes, newClass]);
    return newClass;
  };

  // Delete a class
  const deleteClass = (classId) => {
    setClasses(classes.filter(c => c.id !== classId));
  };

  // Update a class
  const updateClass = (classId, updates) => {
    setClasses(classes.map(c => 
      c.id === classId ? { ...c, ...updates } : c
    ));
  };

  // Rename a class
  const renameClass = (classId, newName) => {
    updateClass(classId, { 
      name: newName,
      displayName: newName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    });
  };

  // Enable/disable a class
  const toggleClass = (classId) => {
    const classObj = classes.find(c => c.id === classId);
    if (classObj) {
      updateClass(classId, { enabled: !classObj.enabled });
    }
  };

  // Set class color
  const setClassColor = (classId, color) => {
    updateClass(classId, { color });
  };

  // Set class confidence threshold
  const setClassThreshold = (classId, threshold) => {
    updateClass(classId, { confidenceThreshold: Math.max(0, Math.min(1, threshold)) });
  };

  // Get enabled classes
  const getEnabledClasses = () => {
    return classes.filter(c => c.enabled);
  };

  // Get class by ID
  const getClassById = (classId) => {
    return classes.find(c => c.id === classId);
  };

  // Get class by name
  const getClassByName = (name) => {
    return classes.find(c => c.name === name);
  };

  // Get classes by category
  const getClassesByCategory = (category) => {
    return classes.filter(c => c.category === category);
  };

  // Reset to default classes
  const resetToDefaults = () => {
    setClasses(DEFAULT_DETECTION_CLASSES);
  };

  // Sync with backend
  const syncWithBackend = async () => {
    setLoading(true);
    try {
      // Get current thresholds from backend
      const response = await fetch('/api/stream/confidence-thresholds');
      if (response.ok) {
        const backendThresholds = await response.json();
        
        // Update local classes with backend thresholds
        setClasses(classes.map(c => ({
          ...c,
          confidenceThreshold: backendThresholds[c.name] || c.confidenceThreshold
        })));
      }
    } catch (error) {
      console.error('Failed to sync with backend:', error);
    } finally {
      setLoading(false);
    }
  };

  // Push to backend
  const pushToBackend = async (classId) => {
    const classObj = getClassById(classId);
    if (!classObj) return;

    try {
      await fetch('/api/stream/confidence-threshold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          class_name: classObj.name,
          threshold: classObj.confidenceThreshold
        })
      });
    } catch (error) {
      console.error('Failed to push to backend:', error);
    }
  };

  return {
    classes,
    loading,
    addClass,
    deleteClass,
    updateClass,
    renameClass,
    toggleClass,
    setClassColor,
    setClassThreshold,
    getEnabledClasses,
    getClassById,
    getClassByName,
    getClassesByCategory,
    resetToDefaults,
    syncWithBackend,
    pushToBackend
  };
};

export default useClassManagement;
