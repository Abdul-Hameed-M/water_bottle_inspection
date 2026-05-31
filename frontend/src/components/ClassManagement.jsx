import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useClassManagement } from '../hooks/useClassManagement';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Badge from './common/Badge';
import Modal from './common/Modal';
import { useToast } from './common/Toast';
import { Plus, Trash2, Edit2, Power, PowerOff, Sliders, Search, Filter, AlertTriangle } from 'lucide-react';
import './ClassManagement.css';

const ClassManagement = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';
  
  const {
    classes,
    loading,
    addClass,
    deleteClass,
    updateClass,
    toggleClass,
    syncWithBackend,
    pushToBackend
  } = useClassManagement();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Forms state
  const [selectedClass, setSelectedClass] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null);
  const [newClassData, setNewClassData] = useState({
    name: '',
    displayName: '',
    color: '#3B82F6',
    confidenceThreshold: 0.50,
    category: 'object'
  });
  const [validationError, setValidationError] = useState('');

  const categories = ['object', 'fill', 'label'];

  const validateClass = (data, isEditing = false) => {
    if (!data.name.trim()) {
      return 'Class name is required.';
    }
    
    // Check for duplicate names (excluding current class if editing)
    const normalizedNewName = data.name.trim().toLowerCase();
    const isDuplicateName = classes.some(c => {
      if (isEditing && c.id === selectedClass?.id) return false;
      return c.name.toLowerCase() === normalizedNewName;
    });

    if (isDuplicateName) {
      return `Class name "${data.name}" already exists. Please choose a unique name.`;
    }

    // Hex color check
    const hexPattern = /^#[0-9A-F]{6}$/i;
    if (!hexPattern.test(data.color)) {
      return 'Invalid Hex color format. Must be like #RRGGBB.';
    }

    return '';
  };

  const handleAddClass = () => {
    const errorMsg = validateClass(newClassData);
    if (errorMsg) {
      setValidationError(errorMsg);
      showToast(errorMsg, 'error', 3000);
      return;
    }

    const cleanName = newClassData.name.trim();
    const finalData = {
      ...newClassData,
      name: cleanName,
      displayName: newClassData.displayName.trim() || cleanName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };

    addClass(finalData);
    showToast(`Added inspection class "${finalData.displayName}" successfully!`, 'success', 3000);
    
    setNewClassData({
      name: '',
      displayName: '',
      color: '#3B82F6',
      confidenceThreshold: 0.50,
      category: 'object'
    });
    setValidationError('');
    setIsAddModalOpen(false);
  };

  const handleEditClass = (classObj) => {
    setSelectedClass(classObj);
    setNewClassData({
      name: classObj.name,
      displayName: classObj.displayName,
      color: classObj.color,
      confidenceThreshold: classObj.confidenceThreshold,
      category: classObj.category
    });
    setValidationError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateClass = () => {
    const errorMsg = validateClass(newClassData, true);
    if (errorMsg) {
      setValidationError(errorMsg);
      showToast(errorMsg, 'error', 3000);
      return;
    }

    if (selectedClass) {
      const cleanName = newClassData.name.trim();
      const finalData = {
        ...newClassData,
        name: cleanName,
        displayName: newClassData.displayName.trim() || cleanName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };

      updateClass(selectedClass.id, finalData);
      pushToBackend(selectedClass.id);
      showToast(`Updated class "${finalData.displayName}" successfully!`, 'success', 3000);
      
      setIsEditModalOpen(false);
      setSelectedClass(null);
      setValidationError('');
    }
  };

  const promptDeleteClass = (classObj) => {
    setClassToDelete(classObj);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteClass = () => {
    if (classToDelete) {
      deleteClass(classToDelete.id);
      showToast(`Deleted class "${classToDelete.displayName}" successfully.`, 'success', 3500);
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    }
  };

  const handleToggleClass = (classId) => {
    toggleClass(classId);
    const classObj = classes.find(c => c.id === classId);
    if (classObj) {
      pushToBackend(classId);
      showToast(
        `${classObj.displayName} is now ${!classObj.enabled ? 'Enabled' : 'Disabled'}`,
        !classObj.enabled ? 'success' : 'warning',
        2000
      );
    }
  };

  const handleSync = async () => {
    await syncWithBackend();
    showToast('Class parameters synchronized with YOLO backend!', 'success', 3000);
  };

  // Filter and Search logs logic
  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="class-management" style={{
      padding: theme.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg
    }}>
      {/* Title */}
      <div style={{
        borderBottom: `1px solid ${theme.colors.border}`,
        paddingBottom: theme.spacing.md
      }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: 800,
          fontFamily: theme.typography.fontFamily.heading,
          color: theme.colors.text.primary,
          margin: 0,
          letterSpacing: '-0.025em'
        }}>
          AI Inspection Class Architect
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.secondary,
          marginTop: '0.25rem',
          margin: 0
        }}>
          Configure, filter, and scale your YOLOv8 classifier boxes and threshold dial configurations.
        </p>
      </div>

      {/* Control Filters Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: '0.75rem 1.25rem',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm
      }}>
        {/* Left Actions */}
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
            variant="primary"
          >
            Add Classifier Class
          </Button>
          <Button
            onClick={handleSync}
            icon={Sliders}
            variant="secondary"
            loading={loading}
          >
            Sync YOLO Backend
          </Button>
        </div>

        {/* Right Search and Categorization */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.sm,
          alignItems: 'center',
          flex: 1,
          justifyContent: 'flex-end',
          maxWidth: '500px',
          width: '100%'
        }}>
          <Input
            placeholder="Search class e.g. bottle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            size="small"
            style={{ maxWidth: '220px', width: '100%' }}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              fontSize: '0.725rem',
              fontFamily: theme.typography.fontFamily.sans,
              fontWeight: theme.typography.fontWeight.semibold,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} Group
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius['2xl'],
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.text.tertiary
        }}>
          No inspection classes match your filter query.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: theme.spacing.lg
        }}>
          {filteredClasses.map((classObj) => (
            <Card
              key={classObj.id}
              padding="lg"
              style={{
                opacity: classObj.enabled ? 1 : 0.6,
                transition: 'all 0.3s ease',
                borderLeft: `4px solid ${classObj.color}`
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.md
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm
                }}>
                  <div
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: theme.borderRadius.lg,
                      backgroundColor: classObj.color + '15',
                      border: `1px solid ${classObj.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: classObj.color,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.bold
                    }}
                  >
                    {classObj.displayName.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.text.primary,
                      fontFamily: theme.typography.fontFamily.heading
                    }}>
                      {classObj.displayName}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '0.625rem',
                      color: theme.colors.text.tertiary,
                      fontFamily: theme.typography.fontFamily.mono
                    }}>
                      name: {classObj.name}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={classObj.enabled ? 'success' : 'ghost'}
                  size="small"
                  glow={classObj.enabled}
                >
                  {classObj.enabled ? 'Active' : 'Muted'}
                </Badge>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.md,
                backgroundColor: theme.colors.surfaceHover,
                padding: '0.75rem',
                borderRadius: theme.borderRadius.xl,
                border: `1px solid ${theme.colors.border}`
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.625rem',
                    color: theme.colors.text.tertiary,
                    fontFamily: theme.typography.fontFamily.mono,
                    textTransform: 'uppercase',
                    marginBottom: '0.25rem'
                  }}>
                    Group Type
                  </label>
                  <Badge variant="outline" size="small">
                    {classObj.category}
                  </Badge>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.625rem',
                    color: theme.colors.text.tertiary,
                    fontFamily: theme.typography.fontFamily.mono,
                    textTransform: 'uppercase',
                    marginBottom: '0.25rem'
                  }}>
                    AI Filter Dial
                  </label>
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: 700,
                    color: theme.colors.text.primary,
                    fontFamily: theme.typography.fontFamily.mono
                  }}>
                    {(classObj.confidenceThreshold * 100).toFixed(0)}% limit
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: theme.spacing.xs,
                justifyContent: 'flex-end',
                borderTop: `1px solid ${theme.colors.border}`,
                paddingTop: theme.spacing.sm
              }}>
                <Button
                  onClick={() => handleToggleClass(classObj.id)}
                  variant="ghost"
                  size="small"
                  icon={classObj.enabled ? PowerOff : Power}
                  title={classObj.enabled ? 'Mute' : 'Active'}
                />
                <Button
                  onClick={() => handleEditClass(classObj)}
                  variant="ghost"
                  size="small"
                  icon={Edit2}
                  title="Configure"
                />
                <Button
                  onClick={() => promptDeleteClass(classObj)}
                  variant="ghost"
                  size="small"
                  icon={Trash2}
                  title="Remove"
                  style={{ color: theme.colors.error }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setValidationError(''); }}
        title="Add New Inspection Classifier"
        subtitle="Configure internal names, visual color bands, and strict thresholds."
        footer={
          <>
            <Button
              onClick={() => { setIsAddModalOpen(false); setValidationError(''); }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddClass}
              variant="primary"
            >
              Initialize Class
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {validationError && (
            <div style={{
              padding: '0.625rem 0.875rem',
              backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2',
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.error}25`,
              color: theme.colors.error,
              fontSize: '0.725rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={14} />
              <span>{validationError}</span>
            </div>
          )}

          <Input
            label="Internal Bounding Name"
            placeholder="e.g. logo_wrinkle"
            value={newClassData.name}
            onChange={(e) => {
              const val = e.target.value.replace(/\s+/g, '_');
              setNewClassData({ ...newClassData, name: val });
            }}
            helperText="YOLO schema output mapping label (must contain no spaces; use underscores)."
            required
          />
          <Input
            label="Display Dashboard Name"
            placeholder="e.g. Logo Wrinkle"
            value={newClassData.displayName}
            onChange={(e) => setNewClassData({ ...newClassData, displayName: e.target.value })}
            helperText="Human readable labels shown on shift consoles."
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.625rem',
                fontWeight: 700,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono,
                textTransform: 'uppercase',
                marginBottom: theme.spacing.xs
              }}>
                Category Group
              </label>
              <select
                value={newClassData.category}
                onChange={(e) => setNewClassData({ ...newClassData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.text.primary,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()} View
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.625rem',
                fontWeight: 700,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono,
                textTransform: 'uppercase',
                marginBottom: theme.spacing.xs
              }}>
                Confidence Limit: {(newClassData.confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={newClassData.confidenceThreshold}
                onChange={(e) => setNewClassData({ ...newClassData, confidenceThreshold: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  height: '4px',
                  accentColor: theme.colors.primary,
                  marginTop: '0.5rem',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: theme.colors.text.secondary,
              fontFamily: theme.typography.fontFamily.mono,
              textTransform: 'uppercase',
              marginBottom: theme.spacing.xs
            }}>
              Classifier Color Brand Hex
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <input
                  type="color"
                  value={newClassData.color}
                  onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.lg,
                    cursor: 'pointer',
                    padding: '0.1rem',
                    backgroundColor: 'transparent'
                  }}
                />
              </div>
              <Input
                placeholder="#3B82F6"
                value={newClassData.color}
                onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Class Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedClass(null); setValidationError(''); }}
        title={`Configure Class: ${selectedClass?.displayName}`}
        subtitle="Update dials and visual hex maps securely."
        footer={
          <>
            <Button
              onClick={() => { setIsEditModalOpen(false); setSelectedClass(null); setValidationError(''); }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateClass}
              variant="primary"
            >
              Commit Dials
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {validationError && (
            <div style={{
              padding: '0.625rem 0.875rem',
              backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2',
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.error}25`,
              color: theme.colors.error,
              fontSize: '0.725rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={14} />
              <span>{validationError}</span>
            </div>
          )}

          <Input
            label="Internal Bounding Name"
            placeholder="e.g. logo_wrinkle"
            value={newClassData.name}
            onChange={(e) => {
              const val = e.target.value.replace(/\s+/g, '_');
              setNewClassData({ ...newClassData, name: val });
            }}
            helperText="WARNING: Modifying internal YOLO values might affect class evaluation lists."
            required
          />
          <Input
            label="Display Dashboard Name"
            placeholder="e.g. Logo Wrinkle"
            value={newClassData.displayName}
            onChange={(e) => setNewClassData({ ...newClassData, displayName: e.target.value })}
            helperText="Text shown on metrics grids."
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.625rem',
                fontWeight: 700,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono,
                textTransform: 'uppercase',
                marginBottom: theme.spacing.xs
              }}>
                Category Group
              </label>
              <select
                value={newClassData.category}
                onChange={(e) => setNewClassData({ ...newClassData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.text.primary,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()} View
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.625rem',
                fontWeight: 700,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono,
                textTransform: 'uppercase',
                marginBottom: theme.spacing.xs
              }}>
                Confidence Limit: {(newClassData.confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={newClassData.confidenceThreshold}
                onChange={(e) => setNewClassData({ ...newClassData, confidenceThreshold: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  height: '4px',
                  accentColor: theme.colors.primary,
                  marginTop: '0.5rem',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: theme.colors.text.secondary,
              fontFamily: theme.typography.fontFamily.mono,
              textTransform: 'uppercase',
              marginBottom: theme.spacing.xs
            }}>
              Classifier Color Brand Hex
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
              <input
                type="color"
                value={newClassData.color}
                onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  cursor: 'pointer',
                  padding: '0.1rem',
                  backgroundColor: 'transparent'
                }}
              />
              <Input
                placeholder="#3B82F6"
                value={newClassData.color}
                onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Custom premium delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setClassToDelete(null); }}
        title="Confirm Deletion Warning"
        size="small"
        footer={
          <>
            <Button
              onClick={() => { setIsDeleteModalOpen(false); setClassToDelete(null); }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteClass}
              variant="danger"
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}>
          <div style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: `1px solid rgba(239, 68, 68, 0.25)`,
            color: theme.colors.error,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
            <Trash2 size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text.primary }}>
              Delete Class: {classToDelete?.displayName}?
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.725rem', color: theme.colors.text.secondary, lineHeight: 1.4, maxWidth: '280px' }}>
              Are you sure you want to delete this class? This will wipe the bounding boxes and thresholds configuration from local cache.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ClassManagement;
