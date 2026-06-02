import React, { useEffect, useState, useRef } from 'react';
import { getWebSocketUrl } from '../services/socket';
import { Play, Square, Pause, Download, AlertCircle, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import Card from './common/Card';
import Button from './common/Button';
import Badge from './common/Badge';
import { useToast } from './common/Toast';

const DetectionFeed = ({ activeTab, sourceUrl = "", cameraIndex = 0, uploadedInspectionId = null }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const [streaming, setStreaming] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  
  const [stats, setStats] = useState({
    total_bottles: 0,
    passed: 0,
    failed: 0,
    proper_fill: 0,
    under_fill: 0,
    over_fill: 0,
    label_proper: 0,
    label_torn: 0,
    label_missing: 0,
    latency: 0,
    stream_fps: 0,
    inspection_id: "",
    source_type: "",
    actual_source: ""
  });
  
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const localStreamRef = useRef(null);

  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      console.warn("Audio Context init failed. Awaiting interaction.");
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sanitizeStreamUrl = (raw) => (raw || '').trim().replace(/^['"]|['"]$/g, '');

  const startStreaming = async () => {
    try {
      if (activeTab !== 'upload') {
        try {
          await api.post('/stream/stop-stream');
        } catch (e) {}
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStreaming(false);
      setImageSrc(null);

      let endpoint = '';
      let payload = {};

      if (activeTab === 'webcam') {
        const isMac = /Mac/.test(navigator.platform);
        const isEmbedded = window.self !== window.top || navigator.userAgent.includes("Electron") || navigator.userAgent.includes("wv");
        
        let permissionState = null;
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const status = await navigator.permissions.query({ name: "camera" });
            permissionState = status.state;
          }
        } catch (e) {
          console.warn("Permissions query not supported", e);
        }

        if (window.currentStream) {
          try {
            window.currentStream.getTracks().forEach(track => track.stop());
          } catch (e) {}
          window.currentStream = null;
        }
        if (localStreamRef.current) {
          try {
            localStreamRef.current.getTracks().forEach(track => track.stop());
          } catch (e) {}
          localStreamRef.current = null;
        }

        try {
          if (!navigator.mediaDevices) {
            throw new TypeError("Browser block: mediaDevices is undefined. Camera access requires a Secure Context (HTTPS or localhost). If you are accessing via a local network IP address, browsers restrict and disable the camera API.");
          }
          let stream = null;
          let retryCount = 0;
          const maxRetries = 1;

          const safeConstraints = {
            audio: false,
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };

          const fallbackConstraints = {
            audio: false,
            video: true
          };

          while (!stream && retryCount <= maxRetries) {
            try {
              if (retryCount === 0) {
                stream = await navigator.mediaDevices.getUserMedia(safeConstraints);
              } else {
                console.warn("First request failed. Retrying with basic constraints: video: true");
                stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
              }
            } catch (err) {
              if ((err.name === 'NotReadableError' || err.name === 'TrackStartError') && retryCount === 0) {
                console.warn("Encountered NotReadableError. Retrying automatically...");
                retryCount++;
                continue;
              }
              if (err.name === 'OverconstrainedError' && retryCount === 0) {
                retryCount++;
                continue;
              }
              throw err;
            }
            break;
          }

          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            window.currentStream = null;
            await sleep(600);
          }
        } catch (err) {
          console.error("Camera permission or access failed:", err);
          if (permissionState === 'granted' && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
            console.warn("Permission state is 'granted' but getUserMedia returned NotAllowedError. Suppressing false alert.");
          }

          if (isMac && isEmbedded) {
            showToast("Open localhost:3000 directly in Chrome or Safari.", "error", 4000);
            return;
          }

          let errorMessage = "Could not access the camera. ";
          if (err instanceof TypeError && err.message.includes("Browser block: mediaDevices is undefined")) {
            errorMessage = "Camera blocked: Browsers restrict camera access to Secure Contexts (HTTPS or localhost). Please open the application using http://localhost:3000 in your browser instead of the Network IP.";
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage += isMac 
              ? "Permission denied. Please enable Mac camera permissions in System Settings -> Privacy & Security -> Camera for your browser."
              : "Permission denied. Please check your browser privacy settings.";
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage += "Camera is already in use by another application. Please close other apps and try again.";
          } else {
            errorMessage += `Error: ${err.message || err.name}`;
          }

          showToast(errorMessage, 'error', 5000);
          return;
        }

        endpoint = '/stream/start-webcam';
        payload = { index: cameraIndex };
      } else if (activeTab === 'ipcam') {
        const url = (sourceUrl || '').trim().split(/\s+/)[0];
        if (!url) {
          showToast('Enter your phone IP camera stream URL.', 'warning', 3000);
          return;
        }
        endpoint = '/stream/connect-ipcam';
        payload = { url };
      } else if (activeTab === 'rtsp') {
        const url = sanitizeStreamUrl(sourceUrl);
        if (!url) {
          showToast('Enter your RTSP stream coordinates.', 'warning', 3000);
          return;
        }
        endpoint = '/stream/connect-rtsp';
        payload = { url };
      }

      showToast('Connecting inspection stream to YOLOv8 core...', 'info', 3000);
      
      if (endpoint) {
        const connectTimeout = activeTab === 'ipcam' || activeTab === 'rtsp' ? 120000 : undefined;
        const res = await api.post(endpoint, payload, { timeout: connectTimeout });
        if (res.data?.actual_source) {
          console.log('[SeeWise Feed] Backend source:', res.data.actual_source);
        }
      }
      
      setIsPaused(false);
      
      // Initialize WebSocket connection
      const wsUrl = getWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setStreaming(true);
        showToast('Telemetry connection initialized successfully!', 'success', 3000);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.image) {
          setImageSrc(data.image);
        }
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.detections) {
          setDetections(data.detections);
          
          const hasFail = data.detections.some(d => d.pass_fail === 'FAIL' || d.pass_fail === 'WARNING');
          if (hasFail) {
            playAlertSound();
          }
        }
      };

      wsRef.current.onclose = () => {
        setStreaming(false);
        setImageSrc(null);
      };

      wsRef.current.onerror = (e) => {
        console.error('[SeeWise Feed] WebSocket error:', e);
        showToast('WebSocket connection failed. Verify port 8000.', 'error', 3500);
      };

    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || d).join('\n')
        : detail || error.message || 'Failed to initialize video source.';
      showToast(msg, 'error', 4000);
    }
  };

  const togglePause = async () => {
    try {
      if (isPaused) {
        await api.post('/stream/resume');
        setIsPaused(false);
        showToast('Stream resumed', 'success', 1500);
      } else {
        await api.post('/stream/pause');
        setIsPaused(true);
        showToast('Stream paused', 'warning', 1500);
      }
    } catch (e) {
      console.error("Failed to toggle pause:", e);
    }
  };

  const exportProcessedVideo = () => {
    const inspectionId = stats.inspection_id || uploadedInspectionId;
    if (!inspectionId) {
      showToast("No active session ID generated. Process a video first.", "warning", 3000);
      return;
    }
    window.open(`/api/upload/export/${inspectionId}`, '_blank');
    showToast('Exporting processed AVI shift scan...', 'success', 2500);
  };

  const stopStreaming = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (window.currentStream) {
        try {
          window.currentStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
        window.currentStream = null;
      }
      await api.post('/stream/stop-stream');
      setStreaming(false);
      setImageSrc(null);
      setDetections([]);
      setIsPaused(false);
      showToast('Inspection stream stopped securely.', 'warning', 2500);
    } catch (error) {
      console.error('[SeeWise Feed] Failed to stop stream:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      if (window.currentStream) {
        try {
          window.currentStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
      }
    };
  }, []);

  const isOnline = streaming;
  const isStreamActive = streaming && imageSrc !== null;
  const isModelRunning = streaming && stats.latency > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      
      <div 
        style={{
          display: 'grid',
          gap: theme.spacing.lg
        }}
        className="grid-cols-1 lg:grid-cols-12"
      >
        
        {/* Left Side: Live stream view screen panel + Controls */}
        <div 
          style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md, height: '100%' }}
          className="lg:col-span-7"
        >
          
          <div style={{
            borderRadius: theme.borderRadius['2xl'],
            backgroundColor: '#070A13',
            overflow: 'hidden',
            border: `1px solid ${theme.colors.border}`,
            transition: 'all 0.15s ease',
            boxShadow: theme.shadows.md,
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}>
            
            {/* SCADA Stream telemetry header bar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#0F121D',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF',
              fontFamily: theme.typography.fontFamily.mono,
              fontSize: '0.675rem',
              letterSpacing: '0.05em'
            }} className="sm:flex-row sm:items-center sm:justify-between select-none">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748B' }}>
                  SOURCE: <strong style={{ color: '#F8FAFB' }}>
                    {streaming ? (
                      stats.actual_source ? `[${stats.actual_source}]` : '[CAMERA ACTIVE]'
                    ) : '[STANDBY]'}
                  </strong>
                </span>
                <span style={{ color: '#64748B' }}>
                  YOLOv8: <strong style={{ color: isModelRunning ? theme.colors.success : '#64748B' }}>
                    {isModelRunning ? '[INFERENCE RUNNING]' : '[STANDBY]'}
                  </strong>
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {streaming && (
                  <>
                    <span style={{ color: theme.colors.success, fontWeight: 700 }}>FPS: [{stats.stream_fps}]</span>
                    <span style={{ color: theme.colors.primary, fontWeight: 700 }}>SPEED: [{stats.latency.toFixed(0)}ms]</span>
                  </>
                )}
                <span style={{ color: isOnline ? theme.colors.success : '#64748B', fontWeight: 700 }}>
                  {isOnline ? '[ONLINE]' : '[OFFLINE]'}
                </span>
              </div>
            </div>

            {/* Video screen box canvas */}
            <div style={{
              position: 'relative',
              flex: 1,
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              minHeight: '380px'
            }}>
              {imageSrc ? (
                <img src={imageSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Inspection Core Stream" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#64748B', textAlign: 'center', padding: '2rem' }}>
                  <ShieldAlert size={48} className="animate-pulse" style={{ color: '#1E2538' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.sm, fontWeight: 700, color: '#F8FAFB', fontFamily: theme.typography.fontFamily.heading }}>Inspection Stream Standby</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.675rem', color: '#64748B', maxWidth: '280px' }}>
                      Activate your shift telemetry inputs and launch the stream processor.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Inline Buttons Action Controls bar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.sm,
            padding: '0.75rem 1.25rem',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            boxShadow: theme.shadows.sm
          }} className="sm:flex-row sm:items-center sm:justify-between">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!streaming ? (
                <Button
                  onClick={startStreaming}
                  icon={Play}
                  variant="primary"
                >
                  Start Inspection
                </Button>
              ) : (
                <Button
                  onClick={stopStreaming}
                  icon={Square}
                  variant="danger"
                >
                  Terminate Stream
                </Button>
              )}

              {streaming && activeTab === 'upload' && (
                <Button
                  onClick={togglePause}
                  variant={isPaused ? 'success' : 'secondary'}
                  icon={Play}
                >
                  {isPaused ? 'Resume Play' : 'Pause'}
                </Button>
              )}

              {activeTab === 'upload' && (stats.inspection_id || uploadedInspectionId) && (
                <Button
                  onClick={exportProcessedVideo}
                  variant="secondary"
                  icon={Download}
                >
                  Export Scan
                </Button>
              )}

              <Button
                onClick={() => { setSoundEnabled(!soundEnabled); showToast(soundEnabled ? 'Alarm speaker muted' : 'Alarm speaker active', 'info', 1500); }}
                variant="secondary"
                icon={soundEnabled ? Volume2 : VolumeX}
                style={{ color: soundEnabled ? theme.colors.success : theme.colors.error }}
              />
            </div>

            {/* Glowing bulbs */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              fontFamily: theme.typography.fontFamily.mono,
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.025em'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? theme.colors.success : theme.colors.text.tertiary,
                  boxShadow: isOnline ? `0 0 8px ${theme.colors.success}` : 'none',
                  animation: isOnline ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }} />
                <span style={{ color: isOnline ? theme.colors.success : theme.colors.text.tertiary }}>ONLINE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isStreamActive ? theme.colors.success : theme.colors.text.tertiary,
                  boxShadow: isStreamActive ? `0 0 8px ${theme.colors.success}` : 'none',
                  animation: isStreamActive ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }} />
                <span style={{ color: isStreamActive ? theme.colors.success : theme.colors.text.tertiary }}>FEED ACTIVE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isModelRunning ? theme.colors.success : theme.colors.text.tertiary,
                  boxShadow: isModelRunning ? `0 0 8px ${theme.colors.success}` : 'none',
                  animation: isModelRunning ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }} />
                <span style={{ color: isModelRunning ? theme.colors.success : theme.colors.text.tertiary }}>YOLO RUNNING</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Metrics accumulator running */}
        <div className="lg:col-span-5" style={{ display: 'flex', flexDirection: 'column' }}>
          <Card 
            title="Metrics Accumulator" 
            padding="lg"
            style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: theme.shadows.md,
              border: `1px solid ${theme.colors.border}` 
            }}
          >
            {/* Real-time Telemetry Pulse Status Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              backgroundColor: isDark ? '#0A0E1A' : '#F1F5F9',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.15)'}`,
              borderRadius: theme.borderRadius.xl,
              marginBottom: theme.spacing.md,
              boxShadow: isDark ? '0 0 15px rgba(59, 130, 246, 0.05)' : 'none',
              fontFamily: theme.typography.fontFamily.mono,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  position: 'relative',
                  display: 'flex',
                  height: '8px',
                  width: '8px'
                }}>
                  <span style={{
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                    position: 'absolute',
                    inlineSize: '100%',
                    blockSize: '100%',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? theme.colors.success : theme.colors.text.tertiary,
                    opacity: 0.75
                  }} />
                  <span style={{
                    position: 'relative',
                    borderRadius: '50%',
                    height: '8px',
                    width: '8px',
                    backgroundColor: isOnline ? theme.colors.success : theme.colors.text.tertiary
                  }} />
                </span>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: isOnline ? theme.colors.success : theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isOnline ? 'TELEMETRY ONLINE' : 'TELEMETRY STANDBY'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.675rem', fontWeight: 700 }}>
                <span style={{ color: theme.colors.text.secondary }}>
                  LATEST ID: <strong style={{ color: theme.colors.primary, textShadow: isDark ? `0 0 8px ${theme.colors.primary}40` : 'none' }}>
                    {detections.length > 0 ? `#${detections[detections.length - 1].bottle_id}` : 'N/A'}
                  </strong>
                </span>
              </div>
            </div>
            
            {/* Shift telemetry dials grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.md,
              fontFamily: theme.typography.fontFamily.mono
            }}>
              
              {/* SHIFT TOTAL COUNT DIAL */}
              <div style={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.06)' : 'rgba(37, 99, 235, 0.03)',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.15)'}`,
                padding: '1.25rem 1rem',
                borderRadius: theme.borderRadius.xl,
                textAlign: 'center',
                boxShadow: isDark ? '0 0 15px rgba(59, 130, 246, 0.1)' : theme.shadows.sm,
                position: 'relative',
                overflow: 'hidden',
                gridColumn: 'span 2'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />
                <span style={{ fontSize: '0.75rem', color: theme.colors.primary, textTransform: 'uppercase', display: 'block', fontWeight: 800, letterSpacing: '0.05em' }}>Shift Bottle Count</span>
                <span style={{ fontSize: '2.75rem', fontWeight: 900, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading, display: 'block', marginTop: '0.25rem', textShadow: isDark ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none' }}>
                  {stats.total_bottles}
                </span>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '1.1rem 0.85rem',
                borderRadius: theme.borderRadius.xl,
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.05)'
              }}>
                <span style={{ fontSize: '0.7rem', color: theme.colors.success, textTransform: 'uppercase', display: 'block', fontWeight: 700, letterSpacing: '0.05em' }}>Verdict OK</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: theme.colors.success, fontFamily: theme.typography.fontFamily.heading, display: 'block', marginTop: '0.25rem' }}>{stats.passed}</span>
              </div>

              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '1.1rem 0.85rem',
                borderRadius: theme.borderRadius.xl,
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.05)'
              }}>
                <span style={{ fontSize: '0.7rem', color: theme.colors.error, textTransform: 'uppercase', display: 'block', fontWeight: 700, letterSpacing: '0.05em' }}>Verdict Reject</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: theme.colors.error, fontFamily: theme.typography.fontFamily.heading, display: 'block', marginTop: '0.25rem' }}>{stats.failed}</span>
              </div>

              {/* Fill verification summary */}
              <div style={{
                gridColumn: 'span 2',
                backgroundColor: theme.colors.surfaceHover,
                border: `1px solid ${theme.colors.border}`,
                padding: '0.85rem',
                borderRadius: theme.borderRadius.xl,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <span style={{ fontSize: '0.675rem', color: theme.colors.text.secondary, textTransform: 'uppercase', fontWeight: 700, borderBottom: `1px dashed ${theme.colors.border}`, paddingBottom: '0.35rem', display: 'block', letterSpacing: '0.025em' }}>Fill verification</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '0.825rem', fontWeight: 700 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: theme.colors.text.tertiary, display: 'block', fontSize: '0.6rem', marginBottom: '0.125rem' }}>PROPER</span>
                    <span style={{ color: theme.colors.success, fontSize: '1rem' }}>{stats.proper_fill}</span>
                  </div>
                  <div style={{ flex: 1, borderLeft: `1px solid ${theme.colors.border}`, borderRight: `1px solid ${theme.colors.border}` }}>
                    <span style={{ color: theme.colors.text.tertiary, display: 'block', fontSize: '0.6rem', marginBottom: '0.125rem' }}>UNDER</span>
                    <span style={{ color: theme.colors.error, fontSize: '1rem' }}>{stats.under_fill}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: theme.colors.text.tertiary, display: 'block', fontSize: '0.6rem', marginBottom: '0.125rem' }}>OVER</span>
                    <span style={{ color: theme.colors.warning, fontSize: '1rem' }}>{stats.over_fill}</span>
                  </div>
                </div>
              </div>

              {/* Label verification summary */}
              <div style={{
                gridColumn: 'span 2',
                backgroundColor: theme.colors.surfaceHover,
                border: `1px solid ${theme.colors.border}`,
                padding: '0.85rem',
                borderRadius: theme.borderRadius.xl,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <span style={{ fontSize: '0.675rem', color: theme.colors.text.secondary, textTransform: 'uppercase', fontWeight: 700, borderBottom: `1px dashed ${theme.colors.border}`, paddingBottom: '0.35rem', display: 'block', letterSpacing: '0.025em' }}>Label verification</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '0.825rem', fontWeight: 700 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: theme.colors.text.tertiary, display: 'block', fontSize: '0.6rem', marginBottom: '0.125rem' }}>PROPER</span>
                    <span style={{ color: theme.colors.success, fontSize: '1rem' }}>{stats.label_proper}</span>
                  </div>
                  <div style={{ flex: 1, borderLeft: `1px solid ${theme.colors.border}`, borderRight: `1px solid ${theme.colors.border}` }}>
                    <span style={{ color: theme.colors.text.tertiary, display: 'block', fontSize: '0.6rem', marginBottom: '0.125rem' }}>TORN</span>
                    <span style={{ color: theme.colors.warning, fontSize: '1rem' }}>{stats.label_torn}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: theme.colors.text.tertiary, display: 'block', fontSize: '0.6rem', marginBottom: '0.125rem' }}>MISSING</span>
                    <span style={{ color: theme.colors.error, fontSize: '1rem' }}>{stats.label_missing}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <h4 style={{ margin: 0, fontSize: '0.725rem', fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Active Frame Items</h4>
              <Badge variant="ghost" size="small">{detections.length} In Frame</Badge>
            </div>

            {detections.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.colors.text.tertiary, textAlign: 'center', gap: '0.25rem', padding: '2rem 1rem' }}>
                <AlertCircle size={20} className="animate-pulse" style={{ color: theme.colors.text.tertiary }} />
                <span style={{ fontSize: '0.725rem', fontWeight: 700 }}>Shift Line Empty</span>
                <span style={{ fontSize: '0.625rem', maxWidth: '170px' }}>Place containers under camera focal frame nodes.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '350px', paddingRight: '0.25rem', flex: 1 }}>
                {detections.map((det) => {
                  let badgeVariant = "success";
                  if (det.pass_fail === 'FAIL') badgeVariant = "error";
                  if (det.pass_fail === 'WARNING') badgeVariant = "warning";

                  return (
                    <div 
                      key={det.bottle_id} 
                      style={{ 
                        padding: '0.75rem', 
                        borderRadius: theme.borderRadius.xl, 
                        backgroundColor: theme.colors.surfaceHover, 
                        border: `1px solid ${theme.colors.border}`,
                        borderLeft: `4px solid ${det.pass_fail === 'FAIL' ? theme.colors.error : det.pass_fail === 'WARNING' ? theme.colors.warning : theme.colors.success}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.heading }}>
                          Bottle ID: <strong style={{ color: theme.colors.primary }}>#{det.bottle_id}</strong>
                        </span>
                        <Badge variant={badgeVariant} size="small" glow>{det.pass_fail}</Badge>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.675rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.text.secondary }}>
                          <span>Fluid Vol:</span>
                          <strong style={{ color: det.fill_status === 'under_fill' ? theme.colors.error : det.fill_status === 'over_fill' ? theme.colors.warning : theme.colors.success, textTransform: 'capitalize' }}>
                            {det.fill_status.replace('_', ' ')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.text.secondary }}>
                          <span>Labeling:</span>
                          <strong style={{ color: det.label_status === 'label_missing' ? theme.colors.error : det.label_status === 'label_torn' ? theme.colors.warning : theme.colors.success, textTransform: 'capitalize' }}>
                            {det.label_status.replace('_', ' ')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.text.secondary }}>
                          <span>Confidence:</span>
                          <strong style={{ color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.mono }}>{(det.confidence * 100).toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
      
    </div>
  );
};

export default DetectionFeed;
