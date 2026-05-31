import React, { useRef, useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { getClassColor, toDisplayName } from '../constants/detectionClasses';
import './DetectionOverlay.css';

const DetectionOverlay = ({
  imageSrc,
  detections,
  containerRef,
  showLabels = true,
  showConfidence = true,
  showTrackingId = true,
  labelStyle = 'professional',
  boxStyle = 'rounded',
  glowEffect = false
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!imageSrc || !containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawOverlay();
    };

    const drawOverlay = () => {
      if (!imageSrc) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Load image
      const img = new Image();
      img.onload = () => {
        // Calculate scale to fit image in container
        const containerRect = container.getBoundingClientRect();
        const imgAspect = img.width / img.height;
        const containerAspect = containerRect.width / containerRect.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > containerAspect) {
          drawWidth = containerRect.width;
          drawHeight = drawWidth / imgAspect;
          offsetX = 0;
          offsetY = (containerRect.height - drawHeight) / 2;
        } else {
          drawHeight = containerRect.height;
          drawWidth = drawHeight * imgAspect;
          offsetX = (containerRect.width - drawWidth) / 2;
          offsetY = 0;
        }

        const scaleX = drawWidth / img.width;
        const scaleY = drawHeight / img.height;

        // Draw detections
        detections.forEach((detection) => {
          if (!detection.bbox) return;

          const [x, y, width, height] = detection.bbox;
          const scaledX = x * scaleX + offsetX;
          const scaledY = y * scaleY + offsetY;
          const scaledWidth = width * scaleX;
          const scaledHeight = height * scaleY;

          // Get class color
          const className = detection.class_name || detection.class;
          const color = getClassColor(className) || theme.colors.primary;

          // Draw bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, Math.min(4, scaledWidth / 100));

          if (boxStyle === 'rounded') {
            const radius = Math.min(8, scaledWidth / 10);
            ctx.beginPath();
            ctx.roundRect(scaledX, scaledY, scaledWidth, scaledHeight, radius);
            ctx.stroke();
          } else {
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
          }

          // Add glow effect if enabled
          if (glowEffect) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }

          // Draw label if enabled
          if (showLabels) {
            const displayName = toDisplayName(className);
            const confidence = detection.confidence || 0;
            const trackingId = detection.bottle_id || detection.id;

            let labelText = displayName;
            if (showConfidence) {
              labelText += ` | ${(confidence * 100).toFixed(0)}%`;
            }
            if (showTrackingId && trackingId) {
              labelText += ` | ID: ${trackingId}`;
            }

            // Calculate label dimensions
            ctx.font = `bold ${Math.max(12, Math.min(16, scaledHeight / 20))}px Inter, sans-serif`;
            const textMetrics = ctx.measureText(labelText);
            const textWidth = textMetrics.width;
            const textHeight = Math.max(24, Math.min(32, scaledHeight / 15));
            const padding = 8;

            // Draw label background
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85;

            if (labelStyle === 'professional') {
              // Rounded label background
              const labelRadius = 6;
              ctx.beginPath();
              ctx.roundRect(
                scaledX,
                scaledY - textHeight - padding * 2,
                textWidth + padding * 2,
                textHeight + padding * 2,
                labelRadius
              );
              ctx.fill();

              // Draw label text
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(labelText, scaledX + padding, scaledY - padding);
            } else {
              // Simple label background
              ctx.fillRect(
                scaledX,
                scaledY - textHeight - padding * 2,
                textWidth + padding * 2,
                textHeight + padding * 2
              );

              // Draw label text
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(labelText, scaledX + padding, scaledY - padding);
            }
          }
        });
      };

      img.src = imageSrc;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageSrc, detections, containerRef, theme, showLabels, showConfidence, showTrackingId, labelStyle, boxStyle, glowEffect]);

  return (
    <canvas
      ref={canvasRef}
      className="detection-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  );
};

export default DetectionOverlay;
