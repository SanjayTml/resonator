import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSourceType } from '../../../types';

interface UseAudioEngineResult {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  sourceType: AudioSourceType;
  setSourceType: React.Dispatch<React.SetStateAction<AudioSourceType>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  trackTitle: string;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  handleTabShare: () => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const useAudioEngine = (): UseAudioEngineResult => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState<AudioSourceType>(AudioSourceType.OSCILLATOR);
  const [volume, setVolume] = useState(0.7);
  const [trackTitle, setTrackTitle] = useState('Demo Tone');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const mediaElementSourceCache = useRef(
    new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()
  );

  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.85;
    }

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }

    gainNodeRef.current.gain.value = volume;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      if (sourceType === AudioSourceType.OSCILLATOR) {
        try {
          (sourceNodeRef.current as OscillatorNode).stop();
        } catch (err) {
          // noop
        }
      }
    }

    try {
      if (sourceType === AudioSourceType.MICROPHONE) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = ctx.createMediaStreamSource(stream);
        micSource.connect(analyserRef.current);
        sourceNodeRef.current = micSource;
        setTrackTitle('Microphone Input');
      } else if (sourceType === AudioSourceType.TAB && tabStreamRef.current) {
        const tabSource = ctx.createMediaStreamSource(tabStreamRef.current);
        tabSource.connect(analyserRef.current);
        sourceNodeRef.current = tabSource;
        const track = tabStreamRef.current.getAudioTracks()[0];
        setTrackTitle(track?.label || 'Tab Audio');
      } else if (sourceType === AudioSourceType.FILE && audioElementRef.current) {
        const element = audioElementRef.current;
        let fileSource: MediaElementAudioSourceNode;
        if (mediaElementSourceCache.current.has(element)) {
          fileSource = mediaElementSourceCache.current.get(element)!;
        } else {
          fileSource = ctx.createMediaElementSource(element);
          mediaElementSourceCache.current.set(element, fileSource);
        }
        fileSource.connect(analyserRef.current);
        analyserRef.current?.connect(gainNodeRef.current!);
        sourceNodeRef.current = fileSource;
        if (isPlaying) {
          element.play().catch(console.error);
        }
      } else {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 4;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.15;
        osc.connect(oscGain);
        oscGain.connect(analyserRef.current);
        analyserRef.current?.connect(gainNodeRef.current!);
        osc.start();
        sourceNodeRef.current = osc;
        setTrackTitle('Demo Oscillator');
      }
    } catch (err) {
      console.error('Audio Init Error', err);
    }
  }, [sourceType, isPlaying, volume]);

  useEffect(() => {
    if (isPlaying) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      initAudio();
    } else {
      if (sourceType === AudioSourceType.FILE && audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (sourceType === AudioSourceType.OSCILLATOR && sourceNodeRef.current) {
        try {
          (sourceNodeRef.current as OscillatorNode).stop();
        } catch (err) {
          // noop
        }
      }
    }

    return () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (err) {
          // noop
        }
      }
    };
  }, [isPlaying, sourceType, initAudio]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        volume,
        audioContextRef.current?.currentTime || 0,
        0.1
      );
    }
  }, [volume]);

  const handleTabShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { channelCount: 2 } as any
      });
      if (stream.getAudioTracks().length === 0) {
        alert('No audio track found.');
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      tabStreamRef.current = stream;
      setSourceType(AudioSourceType.TAB);
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    audio.addEventListener('loadedmetadata', () => {
      setTrackTitle(file.name.replace(/\.[^/.]+$/, ''));
    });
    audioElementRef.current = audio;
    setSourceType(AudioSourceType.FILE);
    setIsPlaying(true);
  }, []);

  return {
    isPlaying,
    setIsPlaying,
    sourceType,
    setSourceType,
    volume,
    setVolume,
    trackTitle,
    analyserRef,
    handleTabShare,
    handleFileUpload
  };
};

export default useAudioEngine;
