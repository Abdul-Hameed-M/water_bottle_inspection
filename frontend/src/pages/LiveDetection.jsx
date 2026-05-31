import React, { useState, useEffect } from 'react';
import { Camera, Smartphone, Monitor, Video, Upload, CheckCircle2, Sliders, Cpu, SlidersHorizontal, Settings2 } from 'lucide-react';
import DetectionFeed from '../components/DetectionFeed';
import api from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { useToast } from '../components/common/Toast';

const LiveDetection = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const [activeTab, setActiveTab] = useState('webcam');

  // macOS detected camera list
  const [cameras, setCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);

  // Custom states for cameras
  const [ipCameraUrl, setIpCameraUrl] = useState('http://192.168.43.1:8080/videofeed');
  const [rtspUrl, setRtspUrl] = useState('');

  // Video upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeInspectionId, setActiveInspectionId] = useState(null);

  // Confidence thresholds
  const [confidenceThresholds, setConfidenceThresholds] = useState({
    bottle: 0.40,
    proper_fill: 0.55,
    under_fill: 0.35,
    over_fill: 0.30,
    label_proper: 0.50,
    label_torn: 0.35,
    label_missing: 0.30
  });
  const [loadingThresholds, setLoadingThresholds] = useState(false);

  // Device and image size settings
  const [selectedDevice, setSelectedDevice] = useState('auto');
  const [imageSize, setImageSize] = useState(640);
  const [modelPath, setModelPath] = useState('../models/best_v1.pt');

  useEffect(() => {
    if (activeTab === 'webcam') {
      const fetchCameras = async () => {
        try {
          const res = await api.get('/stream/cameras');
          setCameras(res.data);
          if (res.data.length > 0) {
            setSelectedCameraIndex(res.data[0].index);
          }
        } catch (e) {
          console.error("Failed to query macOS cameras:", e);
        }
      };
      fetchCameras();
    }
  }, [activeTab]);

  // Fetch confidence thresholds on component mount
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const res = await api.get('/stream/confidence-thresholds');
        setConfidenceThresholds(res.data);
      } catch (e) {
        console.error("Failed to fetch confidence thresholds:", e);
      }
    };
    fetchThresholds();
  }, []);

  const handleThresholdChange = async (class_name, value) => {
    const threshold = parseFloat(value);
    setConfidenceThresholds(prev => ({
      ...prev,
      [class_name]: threshold
    }));

    try {
      setLoadingThresholds(true);
      await api.post('/stream/confidence-threshold', {
        class_name,
        threshold
      });
      showToast(`${class_name.replace('_', ' ')} dial updated: ${(threshold * 100).toFixed(0)}%`, 'success', 1500);
    } catch (e) {
      console.error("Failed to update confidence threshold:", e);
      showToast(`Failed to update ${class_name} threshold`, 'error', 3000);
      // Revert on error
      setConfidenceThresholds(prev => ({
        ...prev,
        [class_name]: confidenceThresholds[class_name]
      }));
    } finally {
      setLoadingThresholds(false);
    }
  };

  const handleVideoUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadSuccess(false);
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      showToast('Uploading industrial video file. Please wait...', 'info', 3000);
      const response = await api.post('/upload/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadSuccess(true);
      setActiveInspectionId(response.data.inspection_id);
      showToast('Video processed successfully! Activate inspection feed below.', 'success', 4000);
    } catch (error) {
      showToast(error.response?.data?.detail || 'Failed to upload video file', 'error', 4000);
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'webcam', name: 'Laptop Webcam', icon: Camera },
    { id: 'ipcam', name: 'Mobile IP Camera', icon: Smartphone },
    { id: 'rtsp', name: 'RTSP CCTV', icon: Monitor },
    { id: 'upload', name: 'Recorded Video', icon: Video },
  ];

  const handleTabChange = async (tabId) => {
    if (tabId !== activeTab) {
      try {
        await api.post('/stream/stop-stream');
      } catch (e) {
        /* no active stream */
      }
      setUploadSuccess(false);
      setActiveInspectionId(null);
      showToast(`Source set: ${tabs.find(t => t.id === tabId)?.name}`, 'success', 2000);
    }
    setActiveTab(tabId);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg
    }}>
      {/* Title block */}
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
          Operations Live Stream Controller
        </h1>
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.secondary,
          marginTop: '0.25rem',
          margin: 0
        }}>
          Configure manufacturing camera sources, configure model variables, and launch live overlays.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        padding: '0.45rem',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1rem',
              borderRadius: theme.borderRadius.lg,
              border: 'none',
              backgroundColor: activeTab === tab.id ? theme.colors.primary : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : theme.colors.text.secondary,
              fontFamily: theme.typography.fontFamily.heading,
              fontSize: '0.725rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <tab.icon size={13} style={{ shrink: 0 }} />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Input Specific Config panel */}
      <Card title={`${tabs.find(t => t.id === activeTab)?.name} Configurator`} icon={tabs.find(t => t.id === activeTab)?.icon} padding="lg">
        {activeTab === 'webcam' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading }}>Webcam Evaluation Interface</h4>
            <p style={{ margin: 0, fontSize: '0.725rem', color: theme.colors.text.secondary, lineHeight: 1.4, maxWidth: '600px' }}>
              Communicates dynamically with FaceTime HD, continuity cameras, or external camera hubs registered to macOS workspace kernels.
            </p>
            {cameras.length > 0 && (
              <div style={{ maxWidth: '320px', width: '100%', marginTop: '0.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: theme.colors.text.secondary,
                  fontFamily: theme.typography.fontFamily.mono,
                  textTransform: 'uppercase',
                  marginBottom: theme.spacing.xs
                }}>
                  Target Camera Device Index
                </label>
                <select
                  value={selectedCameraIndex}
                  onChange={(e) => { setSelectedCameraIndex(parseInt(e.target.value)); showToast(`FaceTime Device selected: #${e.target.value}`, 'success', 2000); }}
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
                  {cameras.map((cam) => (
                    <option key={cam.index} value={cam.index}>
                      {cam.name} (Index #{cam.index})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ipcam' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading }}>Mobile IP Camera Hotspot Settings</h4>
            <p style={{ margin: 0, fontSize: '0.725rem', color: theme.colors.text.secondary, lineHeight: 1.4, maxWidth: '700px' }}>
              Android <strong>IP Webcam</strong> chimes: Launch server chimes on your phone, bridge your **Mac to your phone Wi‑Fi hotspot**, then configure coordinates: <span style={{ fontFamily: theme.typography.fontFamily.mono, color: theme.colors.primary }}>http://192.168.43.1:8080/videofeed</span>.
            </p>
            
            <div style={{
              padding: theme.spacing.sm,
              backgroundColor: isDark ? 'rgba(245,158,11,0.04)' : '#FFFDF5',
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.warning}25`,
              fontSize: '0.7rem',
              color: isDark ? theme.colors.text.secondary : '#78350F',
              lineHeight: 1.4,
              maxWidth: '650px'
            }}>
              <strong>Quick Bridging Check:</strong> Ensure IP Webcam is fully running. Connect Mac to hotspot. Safari should successfully load the phone stream home panel on the IP address before starting live feeds.
            </div>

            <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap', maxWidth: '650px', width: '100%', marginTop: '0.25rem' }}>
              <Input
                placeholder="http://192.168.43.1:8080/videofeed"
                value={ipCameraUrl}
                onChange={(e) => setIpCameraUrl(e.target.value)}
                style={{ flex: 1 }}
              />
              <div style={{ display: 'flex', gap: '0.25rem', width: '100%', marginTop: '0.25rem' }} className="sm:w-auto">
                {['http://192.168.43.1:8080/videofeed', 'http://192.168.49.1:8080/videofeed'].map(preset => (
                  <Button
                    key={preset}
                    onClick={() => { setIpCameraUrl(preset); showToast('IP Presets loaded', 'info', 1500); }}
                    variant="secondary"
                    size="small"
                    style={{ fontFamily: theme.typography.fontFamily.mono, fontSize: '9px', padding: '0.35rem 0.5rem' }}
                  >
                    {preset.replace('http://', '')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rtsp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading }}>RTSP CCTV Endpoint Controls</h4>
            <p style={{ margin: 0, fontSize: '0.725rem', color: theme.colors.text.secondary, lineHeight: 1.4, maxWidth: '600px' }}>
              Enter security passwords and endpoint protocols directly: <span style={{ fontFamily: theme.typography.fontFamily.mono }}>rtsp://admin:pa@ssword@192.168.1.5:554/stream</span>.
            </p>
            <div style={{ maxWidth: '600px', width: '100%', marginTop: '0.25rem' }}>
              <Input
                placeholder="rtsp://admin:password@192.168.1.5:554/stream"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                fullWidth
              />
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <h4 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading }}>Shift Offline Video Analyzer</h4>
            <p style={{ margin: 0, fontSize: '0.725rem', color: theme.colors.text.secondary, lineHeight: 1.4, maxWidth: '600px' }}>
              Analyze recorded `.mp4` or `.avi` manufacturing loops in sandbox memory frames.
            </p>
            
            <form onSubmit={handleVideoUpload} style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: `2px dashed ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                padding: '0.625rem 1.25rem',
                borderRadius: theme.borderRadius.lg,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: theme.colors.text.secondary,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.colors.border; }}
              >
                <Upload size={14} />
                <span>{uploadFile ? uploadFile.name : 'Select MP4/AVI Shift Loop...'}</span>
                <input
                  type="file"
                  accept=".mp4,.mov,.avi"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    setUploadFile(e.target.files[0]);
                    setUploadSuccess(false);
                    showToast('Offline shift video selected', 'info', 2000);
                  }}
                />
              </label>

              {uploadFile && (
                <Button
                  type="submit"
                  disabled={uploading}
                  variant="primary"
                  loading={uploading}
                >
                  Process Video File
                </Button>
              )}
            </form>

            {uploadSuccess && (
              <div style={{
                padding: '0.625rem 0.875rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderRadius: theme.borderRadius.lg,
                border: `1px solid ${theme.colors.success}25`,
                color: theme.colors.success,
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                maxWidth: '650px',
                marginTop: '0.5rem'
              }}>
                <CheckCircle2 size={14} style={{ shrink: 0 }} />
                <span>YOLOv8 offline video registers populated! Start Live Inspection below.</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 1st & 2nd: Bounding box Stream renderer (Video at top, Metrics accumulator second) */}
      <div style={{ marginTop: '0.5rem' }}>
        {(activeTab !== 'upload' || uploadSuccess) ? (
          <DetectionFeed
            activeTab={activeTab}
            cameraIndex={selectedCameraIndex}
            sourceUrl={activeTab === 'ipcam' ? ipCameraUrl : activeTab === 'rtsp' ? rtspUrl : ''}
            uploadedInspectionId={activeInspectionId}
          />
        ) : (
          <div style={{
            aspectRatio: '16/9',
            borderRadius: theme.borderRadius['2xl'],
            backgroundColor: '#0F0F12',
            border: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#64748B',
            padding: theme.spacing.lg
          }}>
            <Video size={40} style={{ color: '#1E2538', marginBottom: '0.5rem' }} />
            <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: '#F8FAFB', fontFamily: theme.typography.fontFamily.heading }}>Recorded Shift Analyzer Offline</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.725rem', color: '#64748B', maxWidth: '300px' }}>
              Please configure parameters and upload a shift video segment above to boot telemetry.
            </p>
          </div>
        )}
      </div>

      {/* 3rd: Platform Model Settings */}
      <Card title="Platform Model Settings" icon={Settings2} padding="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: theme.spacing.md, marginTop: theme.spacing.md }} className="sm:grid-cols-2">
          
          <Input
            label="Classifier Model Path"
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            helperText="Deployed YOLOv8 weights path."
          />

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
              Hardware Device Selection
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => { setSelectedDevice(e.target.value); showToast(`Hardware accelerator target: ${e.target.value}`, 'success', 2000); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.875rem',
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
              <option value="auto">Auto (Highly Recommended)</option>
              <option value="cpu">Core CPU Execution</option>
              <option value="mps">MPS Apple Silicon Acceleration</option>
              <option value="cuda">CUDA Nvidia GPU Acceleration</option>
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
              Image Feed Size
            </label>
            <select
              value={imageSize}
              onChange={(e) => { setImageSize(parseInt(e.target.value)); showToast(`Model target scale set: ${e.target.value}`, 'info', 2000); }}
              style={{
                width: '100%',
                padding: '0.55rem 0.875rem',
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
              <option value="416">416 px (Ultra-fast yield)</option>
              <option value="640">640 px (Optimized balance)</option>
              <option value="1280">1280 px (Precise detail)</option>
            </select>
          </div>

        </div>
      </Card>

      {/* 4th: Class-Wise Confidence Thresholds */}
      <Card title="Class-Wise Confidence Thresholds" icon={SlidersHorizontal} padding="lg">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: theme.spacing.md,
          marginTop: theme.spacing.md
        }} className="sm:grid-cols-2">
          {Object.entries(confidenceThresholds).map(([class_name, threshold]) => (
            <div 
              key={class_name} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0.625rem 0.875rem',
                backgroundColor: theme.colors.surfaceHover,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.xl,
                gap: '1rem',
                transition: 'all 0.15s ease'
              }}
            >
              <label style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono,
                textTransform: 'uppercase',
                letterSpacing: '0.025em'
              }}>
                {class_name.replace('_', ' ')}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min="10"
                  max="95"
                  step="5"
                  value={Math.round(threshold * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      handleThresholdChange(class_name, val / 100);
                    }
                  }}
                  disabled={loadingThresholds}
                  style={{
                    width: '4.75rem',
                    padding: '0.45rem 1.6rem 0.45rem 0.65rem',
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.lg,
                    color: theme.colors.primary,
                    fontFamily: theme.typography.fontFamily.mono,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textAlign: 'right',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                    opacity: loadingThresholds ? 0.6 : 1,
                    appearance: 'textfield',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.colors.primary;
                    e.target.style.boxShadow = `0 0 8px ${theme.colors.primary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.colors.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '0.6rem',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: theme.colors.text.tertiary,
                  fontFamily: theme.typography.fontFamily.mono,
                  pointerEvents: 'none'
                }}>
                  %
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default LiveDetection;
