import React, { useRef, useEffect, useCallback } from 'react';
import { AudioSourceType, Quality, VisualizerMode } from '../types';

interface VisualizerCanvasProps {
  isPlaying: boolean;
  mode: VisualizerMode;
  sourceType: AudioSourceType;
  quality: Quality;
  volume: number;
  audioElement: HTMLAudioElement | null;
  tabStream: MediaStream | null;
  onCanvasClick?: () => void;
  isDarkMode: boolean;
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ 
  isPlaying, 
  mode, 
  sourceType, 
  quality, 
  volume,
  audioElement,
  tabStream,
  onCanvasClick,
  isDarkMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Particles State
  const particlesRef = useRef<Array<{
    x: number; 
    y: number; 
    baseRadius: number; 
    color: string; 
    vx: number; 
    vy: number;
    freqRange: [number, number]; // Percentages of bandwidth (0.0 - 1.0)
  }>>([]);

  // Cache for MediaElementSourceNodes to avoid "can only be connected once" error
  const mediaElementSourceCache = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());

  // Helper to get FFT size based on quality
  const getFFTSize = useCallback((q: Quality) => {
    switch (q) {
      case Quality.LOW: return 128; // Fewer bars/points
      case Quality.MEDIUM: return 512;
      case Quality.HIGH: return 2048; // Very detailed
      default: return 512;
    }
  }, []);

  // Initialize Audio Context
  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    // Create Analyser if needed
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.smoothingTimeConstant = 0.85;
    } else {
      try { analyserRef.current.disconnect(); } catch (e) {}
    }

    // Create Gain (Volume) if needed
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }

    // Disconnect old source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      if (sourceType === AudioSourceType.OSCILLATOR) {
        try { (sourceNodeRef.current as OscillatorNode).stop(); } catch(e) {}
      }
    }

    // Setup New Source
    try {
      if (sourceType === AudioSourceType.MICROPHONE) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = ctx.createMediaStreamSource(stream);
        micSource.connect(analyserRef.current);
        sourceNodeRef.current = micSource;
      } 
      else if (sourceType === AudioSourceType.TAB && tabStream) {
        const tabSource = ctx.createMediaStreamSource(tabStream);
        tabSource.connect(analyserRef.current);
        // Do NOT connect to speakers (gainNode) to avoid echo
        sourceNodeRef.current = tabSource;
      }
      else if (sourceType === AudioSourceType.FILE && audioElement) {
        let fileSource: MediaElementAudioSourceNode;
        
        // check cache
        if (mediaElementSourceCache.current.has(audioElement)) {
          fileSource = mediaElementSourceCache.current.get(audioElement)!;
        } else {
          fileSource = ctx.createMediaElementSource(audioElement);
          mediaElementSourceCache.current.set(audioElement, fileSource);
        }

        fileSource.connect(analyserRef.current);
        analyserRef.current.connect(gainNodeRef.current); // Connect to speakers
        sourceNodeRef.current = fileSource;
        
        if (isPlaying) {
             // Resume context if needed (browsers block autoplay)
             if (ctx.state === 'suspended') ctx.resume();
             audioElement.play().catch(e => console.error("Playback failed", e));
        }
      }
      else if (sourceType === AudioSourceType.OSCILLATOR) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        
        // Simple LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 2;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        
        osc.connect(analyserRef.current);
        analyserRef.current.connect(gainNodeRef.current);
        osc.start();
        sourceNodeRef.current = osc;
      }
    } catch (err) {
      console.error("Error accessing audio source:", err);
    }

  }, [sourceType, audioElement, tabStream, isPlaying]);

  // Handle Play/Pause
  useEffect(() => {
    if (audioContextRef.current?.state === 'suspended' && isPlaying) {
      audioContextRef.current.resume();
    }
    
    if (sourceType === AudioSourceType.FILE && audioElement) {
      if (isPlaying) audioElement.play().catch(e => console.log('Autoplay blocked', e));
      else audioElement.pause();
    }
  }, [isPlaying, sourceType, audioElement]);

  // Handle Volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [volume]);

  // Handle Source Change or Init
  useEffect(() => {
    if (isPlaying) {
      initAudio();
    }
    return () => {
      // We don't necessarily disconnect everything on unmount because audio context might be shared or reused,
      // but for this component, we can clean up source connections.
      if (sourceNodeRef.current) {
         try { sourceNodeRef.current.disconnect(); } catch(e) {}
      }
    };
  }, [sourceType, audioElement, tabStream, initAudio]);

  // Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyserRef.current.fftSize = getFFTSize(quality);
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;

      const width = canvas.width;
      const height = canvas.height;
      
      if (mode === VisualizerMode.WAVE) {
        analyserRef.current.getByteTimeDomainData(dataArray);
      } else {
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      // Background Color
      ctx.fillStyle = isDarkMode ? '#18181b' : '#fafafa'; 
      ctx.fillRect(0, 0, width, height);

      if (mode === VisualizerMode.BARS) {
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height;
          
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          
          if (isDarkMode) {
             gradient.addColorStop(0, '#e4e4e7'); // zinc-200
             gradient.addColorStop(1, '#52525b'); // zinc-600
          } else {
             gradient.addColorStop(0, '#18181b'); // zinc-900
             gradient.addColorStop(1, '#71717a'); // zinc-500
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      } 
      else if (mode === VisualizerMode.WAVE) {
        ctx.lineWidth = quality === Quality.HIGH ? 3 : 2;
        ctx.strokeStyle = isDarkMode ? '#e4e4e7' : '#18181b';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
      else if (mode === VisualizerMode.CIRCLE) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 4;

        ctx.translate(centerX, centerY);
        
        for (let i = 0; i < bufferLength; i++) {
           const barHeight = (dataArray[i] / 255) * (Math.min(width, height) / 3);
           ctx.rotate((Math.PI * 2) / bufferLength);
           
           ctx.fillStyle = isDarkMode 
             ? `rgba(228, 228, 231, ${dataArray[i]/255})` 
             : `rgba(24, 24, 27, ${dataArray[i]/255})`;
           ctx.fillRect(0, radius, (Math.PI * 2 * radius) / bufferLength, barHeight);
        }
        
        ctx.translate(-centerX, -centerY);
      }
      else if (mode === VisualizerMode.PARTICLES) {
        // Initialize particles if needed (or re-init on theme change? No, just change drawing color)
        if (particlesRef.current.length === 0) {
          const count = 35;
          for(let i = 0; i < count; i++) {
            const type = Math.random();
            let baseRadius, freqRange: [number, number], vx, vy;

            if (type < 0.2) { 
              // Bass
              baseRadius = 0.08 + Math.random() * 0.08;
              freqRange = [0.0, 0.05]; 
              vx = (Math.random() - 0.5) * 0.0005;
              vy = (Math.random() - 0.5) * 0.0005;
            } else if (type < 0.6) {
              // Mids
              baseRadius = 0.03 + Math.random() * 0.05;
              freqRange = [0.05, 0.4]; 
              vx = (Math.random() - 0.5) * 0.001;
              vy = (Math.random() - 0.5) * 0.001;
            } else {
              // Highs
              baseRadius = 0.005 + Math.random() * 0.02;
              freqRange = [0.4, 1.0]; 
              vx = (Math.random() - 0.5) * 0.002;
              vy = (Math.random() - 0.5) * 0.002;
            }

            particlesRef.current.push({
              x: Math.random(),
              y: Math.random(),
              baseRadius,
              color: '', // placeholder, determined at draw time
              vx,
              vy,
              freqRange
            });
          }
        }

        // Render Loop
        particlesRef.current.forEach(p => {
          // Move particles
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > 1) p.vx *= -1;
          if (p.y < 0 || p.y > 1) p.vy *= -1;

          // Calculate audio level
          const startIndex = Math.floor(p.freqRange[0] * bufferLength);
          const endIndex = Math.floor(p.freqRange[1] * bufferLength);
          const safeEnd = Math.max(startIndex + 1, Math.min(endIndex, bufferLength));

          let sum = 0;
          for (let k = startIndex; k < safeEnd; k++) {
            sum += dataArray[k];
          }
          const avg = sum / (safeEnd - startIndex);

          // Calculate scale
          const reactivity = 1 + (avg / 255) * 1.5; 
          const currentRadius = p.baseRadius * Math.min(width, height) * reactivity;

          // Determine color based on frequency group (approximated by radius or range)
          // and Theme
          let color = '';
          if (p.freqRange[1] <= 0.05) { // Bass
             color = isDarkMode ? 'rgba(228, 228, 231, 0.15)' : 'rgba(24, 24, 27, 0.15)';
          } else if (p.freqRange[1] <= 0.4) { // Mids
             color = isDarkMode ? 'rgba(161, 161, 170, 0.2)' : 'rgba(82, 82, 91, 0.2)';
          } else { // Highs
             color = isDarkMode ? 'rgba(113, 113, 122, 0.3)' : 'rgba(161, 161, 170, 0.3)';
          }

          ctx.beginPath();
          ctx.arc(p.x * width, p.y * height, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        });
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [mode, quality, isDarkMode]);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();
        
        canvasRef.current.width = rect.width * dpr;
        canvasRef.current.height = rect.height * dpr;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        
        canvasRef.current.style.width = `${rect.width}px`;
        canvasRef.current.style.height = `${rect.height}px`;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef} 
      onClick={onCanvasClick}
      className="w-full h-full relative bg-zinc-50 dark:bg-zinc-900 rounded-[32px] overflow-hidden cursor-pointer transition-colors duration-500"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default VisualizerCanvas;