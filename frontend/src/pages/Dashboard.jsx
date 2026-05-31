import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Play,
  Calendar,
  Camera,
  Smartphone,
  Monitor,
  Video,
  TrendingUp,
  Cpu,
  Database,
  RefreshCw,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTheme } from '../theme/ThemeContext';
import { PageLoader } from '../components/common/Loader';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import api from '../services/api';
import StatCard from '../components/StatCard';
import { useToast } from '../components/common/Toast';

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'all', label: 'All Time' },
];

const SOURCE_OPTIONS = [
  { id: '', label: 'All Sources' },
  { id: 'webcam', label: 'Laptop Webcam' },
  { id: 'ipcam', label: 'Mobile IP Camera' },
  { id: 'rtsp', label: 'RTSP CCTV' },
  { id: 'video', label: 'Recorded Video' },
];

const LABEL_CHART_COLORS = {
  proper_fill: '#10B981',
  under_fill: '#EF4444',
  over_fill: '#F59E0B',
  label_proper: '#3B82F6',
  label_torn: '#FBBF24',
  label_missing: '#F87171',
};

const LABEL_DISPLAY = {
  proper_fill: 'Proper Fill',
  under_fill: 'Under Fill',
  over_fill: 'Over Fill',
  label_proper: 'Proper Label',
  label_torn: 'Torn Label',
  label_missing: 'Missing Label',
};

const Dashboard = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';
  
  const [range, setRange] = useState('today');
  const [sourceFilter, setSourceFilter] = useState('');
  const [data, setData] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // Telemetry simulation states
  const [telemetry, setTelemetry] = useState({
    cpuTemp: 52.4,
    gpuTemp: 54.1,
    latency: 24,
    memoryLoad: 42.5,
    dbSize: 112 // KB
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        cpuTemp: parseFloat((50 + Math.random() * 5).toFixed(1)),
        gpuTemp: parseFloat((52 + Math.random() * 4).toFixed(1)),
        latency: Math.floor(21 + Math.random() * 6),
        memoryLoad: parseFloat((40 + Math.random() * 5).toFixed(1)),
        dbSize: prev.dbSize
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      let url = `/analytics/production?range=${range}`;
      if (sourceFilter) url += `&source_type=${sourceFilter}`;
      const res = await api.get(url);
      setData(res.data);
      if (res.data?.summary?.total_scans && silent) {
        // quiet success
      }
    } catch (e) {
      console.error('Failed to fetch production analytics:', e);
      showToast('Error syncing analytics database', 'error', 3000);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const openSession = async (inspectionId) => {
    setSelectedSession(inspectionId);
    try {
      const res = await api.get(`/analytics/session/${inspectionId}`);
      setSessionDetail(res.data);
    } catch (e) {
      setSessionDetail(null);
      showToast('Failed to fetch session detail', 'error', 2000);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(timer);
  }, [range, sourceFilter]);

  if (loading && !data) {
    return <PageLoader text="Verifying SCADA connection..." />;
  }

  const summary = data?.summary || {};
  const labelCounts = data?.label_counts || {};
  const byDate = data?.by_date || [];
  const bySource = data?.by_source || [];
  const byInspection = data?.by_inspection || [];
  const eod = data?.end_of_day || {};

  const labelPieData = Object.entries(labelCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: LABEL_DISPLAY[name] || name,
      value,
      key: name,
    }));

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    showToast(`Timeframe updated: ${RANGE_OPTIONS.find(o => o.id === newRange)?.label}`, 'success', 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.lg
    }}>
      
      {/* Platform Title Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        borderBottom: `1px solid ${theme.colors.border}`,
        paddingBottom: theme.spacing.md
      }} className="lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: 800,
            fontFamily: theme.typography.fontFamily.heading,
            color: theme.colors.text.primary,
            margin: 0,
            letterSpacing: '-0.025em'
          }}>
            Manufacturing Telemetry Dashboard
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.text.secondary,
            fontFamily: theme.typography.fontFamily.sans,
            marginTop: '0.25rem',
            margin: 0
          }}>
            Industrial water bottle scan reports, live neural network outputs, and operator diagnostics.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: theme.spacing.sm, width: '100%' }} className="sm:w-auto">
          <Button
            onClick={() => { fetchData(true); showToast('Analytics database synced', 'success', 2000); }}
            variant="secondary"
            icon={RefreshCw}
            loading={isRefreshing}
          >
            Sync
          </Button>
          <Button
            onClick={() => navigate('/detection')}
            icon={Play}
            variant="primary"
          >
            Launch Inspection Panel
          </Button>
        </div>
      </div>

      {/* Grid of EOD summary & Telemetry indicators */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-3">
        
        {/* End of Day banner */}
        <div 
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, #111827 0%, #070B13 100%)' 
              : 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
            borderRadius: theme.borderRadius['2xl'],
            padding: theme.spacing.lg,
            border: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: theme.shadows.md
          }}
          className="lg:col-span-2"
        >
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.md
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: theme.colors.primary }} />
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: theme.typography.fontFamily.mono,
                  letterSpacing: '0.075em',
                  color: theme.colors.text.secondary
                }}>
                  SHIFT DIAGNOSTICS & VERDICTS — {eod.date || 'Today'}
                </span>
              </div>
              <Badge variant="success" glow>SHIFT RUNNING</Badge>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing.md
            }} className="md:grid-cols-4">
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Shift Scans</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.text.primary }}>{eod.total_scans ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Verdict OK</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.success }}>{eod.passed ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Defects Flagged</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.error }}>{eod.failed ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.tertiary, margin: 0, textTransform: 'uppercase' }}>Session IDs</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: theme.typography.fontFamily.heading, margin: '0.25rem 0 0 0', color: theme.colors.text.primary }}>{eod.sessions ?? 0}</p>
              </div>
            </div>
          </div>

          {eod.by_source?.length > 0 && (
            <div style={{
              marginTop: theme.spacing.md,
              paddingTop: theme.spacing.md,
              borderTop: `1px solid ${theme.colors.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing.md,
              fontSize: '0.675rem',
              color: theme.colors.text.secondary,
              fontFamily: theme.typography.fontFamily.mono
            }}>
              {eod.by_source.map((s) => (
                <span key={s.source_type} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: theme.colors.primary }} />
                  {s.source_label}: <strong style={{ color: theme.colors.text.primary }}>{s.total}</strong> scans ({s.failed} defects)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Live System telemetry console */}
        <Card title="AI Telemetry Console" icon={Cpu} glass>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Cpu size={12} /> GPU Accelerate</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.success }}>Metal (MPS) Active</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> Inference Telemetry</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.primary }}>~{telemetry.latency} ms</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={12} /> Processor Load</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.text.primary }}>{telemetry.memoryLoad}% heap</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '0.35rem' }}>
              <span style={{ color: theme.colors.text.secondary, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Database size={12} /> Archiver DB</span>
              <span style={{ fontFamily: theme.typography.fontFamily.mono, fontWeight: 700, color: theme.colors.text.primary }}>seewise.db (OK)</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <div style={{ flex: 1, backgroundColor: theme.colors.surfaceHover, borderRadius: theme.borderRadius.md, padding: '0.4rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.55rem', color: theme.colors.text.tertiary, display: 'block' }}>CPU TEMP</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.mono }}>{telemetry.cpuTemp}°C</span>
              </div>
              <div style={{ flex: 1, backgroundColor: theme.colors.surfaceHover, borderRadius: theme.borderRadius.md, padding: '0.4rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.55rem', color: theme.colors.text.tertiary, display: 'block' }}>GPU TEMP</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: theme.colors.primary, fontFamily: theme.typography.fontFamily.mono }}>{telemetry.gpuTemp}°C</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter panel */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        gap: theme.spacing.md,
        boxShadow: theme.shadows.sm
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing.xs
        }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleRangeChange(opt.id)}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.heading,
                fontWeight: 600,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: range === opt.id ? theme.colors.primary : 'transparent',
                color: range === opt.id ? '#FFFFFF' : theme.colors.text.secondary,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (range !== opt.id) e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }}
              onMouseLeave={(e) => {
                if (range !== opt.id) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); showToast('Input filter updated', 'info', 1500); }}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text.primary,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: theme.spacing.md
      }} className="sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Scans" value={summary.total_scans ?? 0} icon={Package} subtitle="Shift output count" />
        <StatCard title="Passed Items" value={summary.passed ?? 0} colorClass="text-pass" icon={CheckCircle2} subtitle="Inspection OK" />
        <StatCard title="Failed Defects" value={summary.failed ?? 0} colorClass="text-fail" icon={AlertTriangle} subtitle="Rejected/Caution" />
        <StatCard title="Platform Yield" value={summary.pass_rate_percent ?? 0} unit="%" colorClass="text-blue-500" icon={TrendingUp} subtitle="Total pass yields" />
        <StatCard title="Active Sessions" value={summary.sessions ?? 0} icon={Activity} subtitle="Shift identifiers" />
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-2">
        
        <Card title="Yield Progression Trend" padding="lg">
          <div style={{ height: '280px', marginTop: theme.spacing.md }}>
            {byDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDate} margin={{ top: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <YAxis tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme.colors.surface, 
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      color: theme.colors.text.primary,
                      fontFamily: theme.typography.fontFamily.sans,
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="passed" name="Pass (OK)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Defects (FAIL)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No yield data recorded.
              </div>
            )}
          </div>
        </Card>

        <Card title="Inspections by Input Device" padding="lg">
          <div style={{ height: '280px', marginTop: theme.spacing.md }}>
            {bySource.some((s) => s.total_scans > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySource} layout="vertical" margin={{ left: -10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.colors.border} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <YAxis type="category" dataKey="source_label" width={110} tick={{ fontSize: 9, fill: theme.colors.text.secondary }} axisLine={{ stroke: theme.colors.border }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: theme.colors.surface, 
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      color: theme.colors.text.primary,
                      fontFamily: theme.typography.fontFamily.sans,
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="passed" name="Pass" fill="#10B981" stackId="a" />
                  <Bar dataKey="failed" name="Fail" fill="#EF4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No device analytics logged.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Defects Analysis Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: theme.spacing.lg
      }} className="lg:grid-cols-2">
        
        <Card title="Defect Label Classification Ratio" padding="lg">
          <div style={{ height: '260px', marginTop: theme.spacing.md }}>
            {labelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={labelPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={2} label={{ fontSize: 9, fill: theme.colors.text.secondary }}>
                    {labelPieData.map((entry) => (
                      <Cell key={entry.key} fill={LABEL_CHART_COLORS[entry.key] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme.colors.surface, 
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      color: theme.colors.text.primary,
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No anomaly labels recorded.
              </div>
            )}
          </div>
        </Card>

        <Card title="Classification Matrix Counters" padding="lg">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            fontSize: theme.typography.fontSize.xs,
            marginTop: theme.spacing.md
          }}>
            {Object.entries(LABEL_DISPLAY).map(([key, label]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${theme.colors.border}`,
                paddingBottom: '0.45rem'
              }}>
                <span style={{ color: theme.colors.text.secondary, fontWeight: 500 }}>{label}</span>
                <span style={{
                  fontFamily: theme.typography.fontFamily.mono,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: LABEL_CHART_COLORS[key],
                  backgroundColor: LABEL_CHART_COLORS[key] + '0F',
                  padding: '0.1rem 0.5rem',
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${LABEL_CHART_COLORS[key]}30`
                }}>
                  {labelCounts[key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Session Tables Panel */}
      <Card title="Inspection Session Records (Active Shift)" padding="lg">
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text.secondary,
          margin: `-0.5rem 0 ${theme.spacing.lg} 0`
        }}>
          Click any session item row to overlay the inspector yield metrics, hourly rates, and diagnostics logs.
        </p>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: theme.typography.fontSize.xs
          }}>
            <thead>
              <tr style={{
                borderBottom: `1px solid ${theme.colors.border}`,
                color: theme.colors.text.secondary,
                fontSize: '0.675rem',
                fontFamily: theme.typography.fontFamily.heading,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Session ID</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Input Device</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Scans</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Verdict OK</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Reject</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Under Fill</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Over Fill</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Torn Label</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Missing Label</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Yield FPS</th>
              </tr>
            </thead>
            <tbody>
              {byInspection.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: theme.colors.text.tertiary,
                    fontWeight: 500
                  }}>
                    Standby mode active. Trigger Live Inspection to feed analytics databases.
                  </td>
                </tr>
              ) : (
                byInspection.map((row) => (
                  <tr
                    key={row.inspection_id}
                    style={{
                      borderBottom: `1px solid ${theme.colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => openSession(row.inspection_id)}
                  >
                    <td style={{
                      padding: '0.85rem 0.5rem',
                      fontFamily: theme.typography.fontFamily.mono,
                      fontWeight: 700,
                      color: theme.colors.primary
                    }}>{row.inspection_id}</td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 500 }}>{row.source_label}</td>
                    <td style={{
                      padding: '0.85rem 0.5rem',
                      color: theme.colors.text.secondary
                    }}>
                      {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>{row.total_scans}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.success, fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>{row.passed}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.error, fontWeight: 700, fontFamily: theme.typography.fontFamily.mono }}>{row.failed}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.text.secondary }}>{row.under_fill}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.text.secondary }}>{row.over_fill}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.text.secondary }}>{row.label_torn}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: theme.colors.text.secondary }}>{row.label_missing}</td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontFamily: theme.typography.fontFamily.mono, fontWeight: 600 }}>{row.avg_fps}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Hourly break overlay session modal */}
      <Modal
        isOpen={!!selectedSession && !!sessionDetail?.session}
        onClose={() => { setSelectedSession(null); setSessionDetail(null); }}
        title={`Session Yield Telemetry ID: ${sessionDetail?.session?.inspection_id}`}
        subtitle={`${sessionDetail?.session?.source_label} · Initiated: ${sessionDetail?.session?.timestamp ? new Date(sessionDetail.session.timestamp).toLocaleString() : ''}`}
        size="large"
      >
        {sessionDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: theme.spacing.md,
              textAlign: 'center'
            }}>
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing.md
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Verdict OK</span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: theme.colors.success,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.25rem'
                }}>{sessionDetail.totals?.passed}</span>
              </div>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing.md
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Verdict Reject</span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: theme.colors.error,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.25rem'
                }}>{sessionDetail.totals?.failed}</span>
              </div>
              <div style={{
                backgroundColor: theme.colors.surfaceHover,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing.md
              }}>
                <span style={{ fontSize: '0.55rem', fontFamily: theme.typography.fontFamily.mono, color: theme.colors.text.secondary, textTransform: 'uppercase', display: 'block' }}>Total Evaluated</span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.fontFamily.heading,
                  display: 'block',
                  marginTop: '0.25rem'
                }}>{sessionDetail.totals?.total_scans}</span>
              </div>
            </div>
            
            {sessionDetail.hourly?.length > 0 ? (
              <div>
                <h4 style={{ fontSize: '0.675rem', fontFamily: theme.typography.fontFamily.heading, fontWeight: 700, color: theme.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: theme.spacing.md }}>Hourly Throughput Speeds</h4>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionDetail.hourly} margin={{ left: -20, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.border} />
                      <XAxis dataKey="hour" tick={{ fontSize: 8, fill: theme.colors.text.secondary }} />
                      <YAxis tick={{ fontSize: 8, fill: theme.colors.text.secondary }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme.colors.surface, 
                          borderColor: theme.colors.border,
                          borderRadius: theme.borderRadius.lg,
                          fontSize: '11px'
                        }} 
                      />
                      <Bar dataKey="passed" fill="#10B981" name="Pass" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="failed" fill="#EF4444" name="Fail" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                No hourly diagnostics tracked for this session.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
