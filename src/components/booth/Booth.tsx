'use client';

import React, { useState } from 'react';
import { BoothSettings } from '@/types';
import { Particles } from './Particles';
import { AdminTrigger } from './AdminTrigger';
import { ScreenSaver } from './ScreenSaver';
import { CaptureScreen } from './CaptureScreen';
import { ProcessingScreen } from './ProcessingScreen';
import { ResultScreen } from './ResultScreen';
import { useToast } from '@/components/ui/Toast';

type BoothState = 'screensaver' | 'capture' | 'processing' | 'result';

interface BoothProps {
  initialSettings: BoothSettings;
}

export function Booth({ initialSettings }: BoothProps) {
  const [settings] = useState<BoothSettings>(initialSettings);
  const [screen, setScreen] = useState<BoothState>('screensaver');
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

  const handleStartCapture = () => {
    setScreen('capture');
  };

  const handleCaptureComplete = (photos: HTMLCanvasElement[]) => {
    setCapturedPhotos(photos);
    setScreen('processing');
  };

  const handleProcessingComplete = (res: {
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
  };

  const handleProcessingError = (msg: string) => {
    toast(msg, 'error');
    setScreen('screensaver');
  };

  return (
    <main className="relative w-screen h-screen min-h-[100dvh] overflow-hidden bg-[#0a0a0f] text-[#f1f0ff]">
      <Particles />

      {screen !== 'capture' && <AdminTrigger />}

      <div className="relative w-full h-full screen-enter">
        {screen === 'screensaver' && (
          <ScreenSaver settings={settings} onStart={handleStartCapture} />
        )}

        {screen === 'capture' && (
          <CaptureScreen
            settings={settings}
            onComplete={handleCaptureComplete}
            onCancel={() => setScreen('screensaver')}
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
            onRetake={() => setScreen('capture')}
            onHome={() => setScreen('screensaver')}
          />
        )}
      </div>
    </main>
  );
}
