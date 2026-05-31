import React, { useState } from 'react';
import { Sliders, Cpu, Bell, Volume2, Shield, Database, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useToast } from '../components/common/Toast';

const Settings = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const [confidence, setConfidence] = useState(25);
  const [resolution, setResolution] = useState('640x480');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveAllScreenshots, setSaveAllScreenshots] = useState(false);

  // Safeguard confirmation states
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmClearDashboard, setConfirmClearDashboard] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearAllHistory = async () => {
    setClearing(true);
    try {
      await api.post('/analytics/clear-all-history');
      showToast('Analytics database purged successfully!', 'success', 4000);
      setConfirmClearAll(false);
    } catch (error) {
      showToast('Database purge failed: ' + (error.response?.data?.error || error.message), 'error', 4000);
    } finally {
      setClearing(false);
    }
  };

  const handleClearDashboardHistory = async () => {
    setClearing(true);
    try {
      await api.post('/analytics/clear-dashboard-history');
      showToast('Dashboard metrics reset successfully!', 'success', 4000);
      setConfirmClearDashboard(false);
    } catch (error) {
      showToast('Dashboard clear failed: ' + (error.response?.data?.error || error.message), 'error', 4000);
    } finally {
      setClearing(false);
    }
  };

  const classes = [
    { id: 0, label: 'bottle', desc: 'Main Container Bounding Volume' },
    { id: 1, label: 'proper_fill', desc: 'Compliant Fluid Fill Line' },
    { id: 2, label: 'under_fill', desc: 'Anomalous Insufficient Fluid (Reject)' },
    { id: 3, label: 'over_fill', desc: 'Caution Overfilled Volume (Warning)' },
    { id: 4, label: 'label_proper', desc: 'Compliant Centered Logo Label' },
    { id: 5, label: 'label_torn', desc: 'Caution Damaged/Wrinkled Label (Warning)' },
    { id: 6, label: 'label_missing', desc: 'Anomalous Missing Label (Reject)' }
  ];

  return (
    <div style={{
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
          Telemetry Settings & Control Dials
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.secondary,
          marginTop: '0.25rem',
          margin: 0
        }}>
          Configure real-time neural network detection constraints and shifting alert registers.
        </p>
      </div>

      {/* Database Management Card */}
      <Card title="Shift Archiver Database Control" icon={Database} padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
          
          {/* Clear All Database */}
          <div style={{
            padding: theme.spacing.md,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.04)' : '#FEF2F2',
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.sm
          }} className="md:flex-row md:items-center md:justify-between">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <AlertTriangle size={15} style={{ color: theme.colors.error }} />
                <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: theme.colors.error, fontFamily: theme.typography.fontFamily.heading }}>
                  PURGE ENTIRE DIAGNOSTICS ARCHIVE
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.725rem', color: isDark ? theme.colors.text.secondary : '#7F1D1D', lineHeight: 1.4 }}>
                Permanently purge ALL inspection records, defective screenshot mappings, and metric summaries from the local database. **This action cannot be undone.**
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, shrink: 0 }}>
              {!confirmClearAll ? (
                <Button
                  onClick={() => setConfirmClearAll(true)}
                  variant="danger"
                  size="small"
                >
                  Purge Database
                </Button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    onClick={handleClearAllHistory}
                    variant="danger"
                    size="small"
                    loading={clearing}
                  >
                    Confirm Purge
                  </Button>
                  <Button
                    onClick={() => setConfirmClearAll(false)}
                    variant="secondary"
                    size="small"
                    disabled={clearing}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Reset Dashboard summaries */}
          <div style={{
            padding: theme.spacing.md,
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.04)' : '#FFFBEB',
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.sm
          }} className="md:flex-row md:items-center md:justify-between">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <AlertTriangle size={15} style={{ color: theme.colors.warning }} />
                <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: isDark ? theme.colors.warning : '#92400E', fontFamily: theme.typography.fontFamily.heading }}>
                  RESET SHIFT KPI ACCUMULATORS
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.725rem', color: isDark ? theme.colors.text.secondary : '#78350F', lineHeight: 1.4 }}>
                Purge shift accumulators, hourly averages, and yield sparklines. All granular inspection log history lists will remain fully intact.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, shrink: 0 }}>
              {!confirmClearDashboard ? (
                <Button
                  onClick={() => setConfirmClearDashboard(true)}
                  variant="secondary"
                  size="small"
                  style={{ color: theme.colors.warning, borderColor: theme.colors.warning + '30' }}
                >
                  Reset summaries
                </Button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    onClick={handleClearDashboardHistory}
                    variant="primary"
                    size="small"
                    style={{ backgroundColor: theme.colors.warning }}
                    loading={clearing}
                  >
                    Confirm Reset
                  </Button>
                  <Button
                    onClick={() => setConfirmClearDashboard(false)}
                    variant="secondary"
                    size="small"
                    disabled={clearing}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </Card>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-3">
        
        {/* Core AI controls & Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }} className="lg:col-span-2">
          
          <Card title="Neural Network Inference Controls" icon={Sliders} padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.mono, textTransform: 'uppercase' }}>Global Bounding Filter</span>
                  <Badge variant="info" glow>{confidence}% Confidence</Badge>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '5px',
                    borderRadius: '9999px',
                    accentColor: theme.colors.primary,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.625rem', color: theme.colors.text.tertiary, lineHeight: 1.4 }}>
                  Imposes a global strictness baseline on model proposals. Higher filters suppress camera glitches but may miss speed defects. Ideal SCADA value: 25-45%.
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                borderTop: `1px solid ${theme.colors.border}`,
                paddingTop: theme.spacing.md
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.mono, textTransform: 'uppercase' }}>Capture Stream Slices</span>
                  <select 
                    value={resolution} 
                    onChange={(e) => { setResolution(e.target.value); showToast(`Resolution dial set: ${e.target.value}`, 'success', 2000); }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text.primary,
                      fontSize: '0.7rem',
                      fontFamily: theme.typography.fontFamily.mono,
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="640x480">640 x 480 (High speed)</option>
                    <option value="1280x720">1280 x 720 (Balanced HD)</option>
                    <option value="1920x1080">1920 x 1080 (Inspect FHD)</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.625rem', color: theme.colors.text.tertiary, lineHeight: 1.4 }}>
                  Sets scaling variables during image serialization. Downscaled resolutions yield higher inference frame rates (FPS).
                </span>
              </div>

            </div>
          </Card>

          <Card title="Platform Alarm Register" icon={Bell} padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
              
              {/* Audio Chime alert */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <span style={{ fontSize: theme.typography.fontSize.xs, fontWeight: 700, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text.primary, display: 'block' }}>
                    Defect Sound Notification Alerts
                  </span>
                  <span style={{ fontSize: '0.625rem', color: theme.colors.text.tertiary, display: 'block', marginTop: '0.125rem', lineHeight: 1.4 }}>
                    Synthesize an electronic alarm sound on the console terminal when an under-fill or missing label is evaluated.
                  </span>
                </div>
                <button
                  onClick={() => { setSoundEnabled(!soundEnabled); showToast(soundEnabled ? 'Acoustic chimes muted' : 'Acoustic chimes activated', 'info', 2000); }}
                  style={{
                    width: '2.5rem',
                    height: '1.25rem',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: soundEnabled ? theme.colors.primary : theme.colors.border,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.15rem',
                    justifyContent: soundEnabled ? 'flex-end' : 'flex-start',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ width: '0.95rem', height: '0.95rem', borderRadius: '50%', backgroundColor: '#FFFFFF', boxShadow: theme.shadows.sm }} />
                </button>
              </div>

              {/* Archive snapshots */}
              <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing.md }}>
                <div style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <span style={{ fontSize: theme.typography.fontSize.xs, fontWeight: 700, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text.primary, display: 'block' }}>
                    Archiving Failure Frame Snapshots
                  </span>
                  <span style={{ fontSize: '0.625rem', color: theme.colors.text.tertiary, display: 'block', marginTop: '0.125rem', lineHeight: 1.4 }}>
                    Write dynamic `.jpg` screenshots of failed inspection boxes directly to local `/storage/failed_bottles` directories for records.
                  </span>
                </div>
                <button
                  onClick={() => { setSaveAllScreenshots(!saveAllScreenshots); showToast(saveAllScreenshots ? 'Frame saving deactivated' : 'Failure frame archiving activated', 'info', 2000); }}
                  style={{
                    width: '2.5rem',
                    height: '1.25rem',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: saveAllScreenshots ? theme.colors.primary : theme.colors.border,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.15rem',
                    justifyContent: saveAllScreenshots ? 'flex-end' : 'flex-start',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ width: '0.95rem', height: '0.95rem', borderRadius: '50%', backgroundColor: '#FFFFFF', boxShadow: theme.shadows.sm }} />
                </button>
              </div>

            </div>
          </Card>

        </div>

        {/* Supported Categories list card */}
        <Card title="Deployed AI Classifier Schema" icon={Cpu} padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{
              backgroundColor: theme.colors.surfaceHover,
              borderRadius: theme.borderRadius.xl,
              padding: theme.spacing.md,
              border: `1px solid ${theme.colors.border}`,
              marginTop: '0.25rem'
            }}>
              <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, block: 'block', textTransform: 'uppercase' }}>DEPLOYED CONSOLE ENGINE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <Shield size={14} style={{ color: theme.colors.primary }} />
                <span style={{ fontSize: '0.725rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.primary }}>YOLOv8s Custom Inspections</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLASSIFICATIONS SCHEMA</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {classes.map((c) => (
                  <div key={c.id} style={{ borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }} className="last:border-0 last:pb-0">
                    <span style={{
                      fontFamily: theme.typography.fontFamily.mono,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      backgroundColor: theme.colors.surfaceHover,
                      border: `1px solid ${theme.colors.border}`,
                      padding: '0.05rem 0.3rem',
                      borderRadius: theme.borderRadius.sm,
                      color: theme.colors.text.primary,
                      marginTop: '0.1rem'
                    }}>{c.id}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading }}>{c.label}</span>
                      <span style={{ fontSize: '0.625rem', color: theme.colors.text.tertiary, marginTop: '0.05rem', lineHeight: 1.3 }}>{c.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
