// Detection class configuration
// This file manages all detection classes with their properties

export const DEFAULT_DETECTION_CLASSES = [
  {
    id: 'bottle',
    name: 'Bottle',
    displayName: 'Bottle',
    color: '#3B82F6',
    enabled: true,
    confidenceThreshold: 0.40,
    category: 'object'
  },
  {
    id: 'proper_fill',
    name: 'proper_fill',
    displayName: 'Proper Fill',
    color: '#10B981',
    enabled: true,
    confidenceThreshold: 0.55,
    category: 'fill'
  },
  {
    id: 'under_fill',
    name: 'under_fill',
    displayName: 'Under Fill',
    color: '#F59E0B',
    enabled: true,
    confidenceThreshold: 0.35,
    category: 'fill'
  },
  {
    id: 'over_fill',
    name: 'over_fill',
    displayName: 'Over Fill',
    color: '#EF4444',
    enabled: true,
    confidenceThreshold: 0.30,
    category: 'fill'
  },
  {
    id: 'label_proper',
    name: 'label_proper',
    displayName: 'Label Proper',
    color: '#10B981',
    enabled: true,
    confidenceThreshold: 0.50,
    category: 'label'
  },
  {
    id: 'label_torn',
    name: 'label_torn',
    displayName: 'Label Torn',
    color: '#F59E0B',
    enabled: true,
    confidenceThreshold: 0.35,
    category: 'label'
  },
  {
    id: 'label_missing',
    name: 'label_missing',
    displayName: 'Label Missing',
    color: '#EF4444',
    enabled: true,
    confidenceThreshold: 0.30,
    category: 'label'
  }
];

// Helper function to convert class name to display name
export const toDisplayName = (className) => {
  return DEFAULT_DETECTION_CLASSES.find(c => c.name === className)?.displayName || className;
};

// Helper function to get class color
export const getClassColor = (className) => {
  return DEFAULT_DETECTION_CLASSES.find(c => c.name === className)?.color || '#3B82F6';
};

// Helper function to get class confidence threshold
export const getClassThreshold = (className) => {
  return DEFAULT_DETECTION_CLASSES.find(c => c.name === className)?.confidenceThreshold || 0.25;
};

// Helper function to get class by ID
export const getClassById = (id) => {
  return DEFAULT_DETECTION_CLASSES.find(c => c.id === id);
};

// Helper function to get enabled classes
export const getEnabledClasses = () => {
  return DEFAULT_DETECTION_CLASSES.filter(c => c.enabled);
};

// Helper function to get classes by category
export const getClassesByCategory = (category) => {
  return DEFAULT_DETECTION_CLASSES.filter(c => c.category === category);
};

export default DEFAULT_DETECTION_CLASSES;
