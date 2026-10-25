'use client';

import React, { useState } from 'react';
import { BoothSettings } from '@/types';
import { Particles } from './Particles';
import { AdminTrigger } from './AdminTrigger';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';
import { ScreenSaver } from './ScreenSaver';
import { CaptureScreen } from './CaptureScreen';
import { ReviewScreen } from './ReviewScreen';
import { ProcessingScreen } from './ProcessingScreen';
import { ResultScreen } from './ResultScreen';
import { useToast } from '@/components/ui/Toast';

type BoothState = 'screensaver' | 'capture' | 'review' | 'processing' | 'result';

interface BoothProps {
  initialSettings: BoothSettings;
}

export function Booth({ initialSettings }: BoothProps) {
  const [settings] = useState<BoothSettings>(initialSettings);
  const [screen, setScreen] = useState<BoothState>('screensaver');
  const [retakeSlotIndex, setRetakeSlotIndex] = useState<number | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<HTMLCanvasElement[]>([]);
  const [resultData, setResultData] = useState<{
    stripCanvas: HTMLCanvasElement;
    stripDataUrl: string;
    gifDataUrl: string | null;
    gifBlob: Blob | null;
    sessionId: string;
    cloudStripUrl?: string | null;
    cloudGifUrl?: string | null;
    viewerUrl?: string | null;
  } | null>(null);

  const { toast } = useToast();

  const handleStartCapture = React.useCallback(() => {
    setRetakeSlotIndex(null);
    setCapturedPhotos([]);
    setScreen('capture');
  }, []);

  const handleCaptureComplete = React.useCallback((photos: HTMLCanvasElement[]) => {
    setRetakeSlotIndex((currentSlot) => {
      if (currentSlot !== null && photos.length > 0) {
        // Replacing an individual retaken photo
        setCapturedPhotos((prev) => {
          const next = [...prev];
          next[currentSlot] = photos[0];
          return next;
        });
      } else {
        // Initial full sequence
        setCapturedPhotos(photos);
      }
      return null;
    });
    setScreen('review');
  }, []);

  const handleCaptureCancel = React.useCallback(() => {
    setRetakeSlotIndex((currentSlot) => {
      if (currentSlot !== null) {
        setScreen('review');
      } else {
        setScreen('screensaver');
      }
      return null;
    });
  }, []);

  const handleRetakeSlot = React.useCallback((slotIndex: number) => {
    setRetakeSlotIndex(slotIndex);
    setScreen('capture');
  }, []);

  const handleApprovePhotos = React.useCallback(() => {
    setScreen('processing');
  }, []);

  const handleRestartAll = React.useCallback(() => {
    setCapturedPhotos([]);
    setRetakeSlotIndex(null);
    setScreen('capture');
  }, []);

  const handleProcessingComplete = React.useCallback((res: {
    stripCanvas: HTMLCanvasElement;
    stripDataUrl: string;
    gifDataUrl: string | null;
    gifBlob: Blob | null;
    sessionId: string;
    cloudStripUrl?: string | null;
    cloudGifUrl?: string | null;
    viewerUrl?: string | null;
  }) => {
    setResultData(res);
    setScreen('result');
  }, []);

  const handleProcessingError = React.useCallback((msg: string) => {
    toast(msg, 'error');
    setScreen('screensaver');
  }, [toast]);

  const handleRetake = React.useCallback(() => {
    setCapturedPhotos([]);
    setRetakeSlotIndex(null);
    setResultData(null);
    setScreen('capture');
  }, []);

  const handleHome = React.useCallback(() => {
    setCapturedPhotos([]);
    setRetakeSlotIndex(null);
    setResultData(null);
    setScreen('screensaver');
  }, []);

  return (
    <main className="relative w-screen h-screen min-h-[100dvh] overflow-hidden bg-[#0a0a0f] text-[#f1f0ff]">
      <Particles />

      {screen !== 'capture' && (
        <>
          <PwaInstallButton />
          <AdminTrigger />
        </>
      )}

      <div className="relative w-full h-full screen-enter">
        {screen === 'screensaver' && (
          <ScreenSaver settings={settings} onStart={handleStartCapture} />
        )}

        {screen === 'capture' && (
          <CaptureScreen
            settings={settings}
            onComplete={handleCaptureComplete}
            onCancel={handleCaptureCancel}
            targetSlotIndex={retakeSlotIndex}
            existingPhotos={capturedPhotos}
          />
        )}

        {screen === 'review' && capturedPhotos.length > 0 && (
          <ReviewScreen
            photos={capturedPhotos}
            settings={settings}
            onRetakeSlot={handleRetakeSlot}
            onConfirm={handleApprovePhotos}
            onRestartAll={handleRestartAll}
          />
        )}

        {screen === 'processing' && (
          <ProcessingScreen
            photos={capturedPhotos}
            settings={settings}
            onComplete={handleProcessingComplete}
            onError={handleProcessingError}
          />
        )}

        {screen === 'result' && resultData && (
          <ResultScreen
            settings={settings}
            result={resultData}
            onRetake={handleRetake}
            onHome={handleHome}
          />
        )}
      </div>
    </main>
  );
}
