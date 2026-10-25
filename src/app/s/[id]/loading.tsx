import React from 'react';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

export default function SessionLoading() {
  return (
    <LoadingOverlay
      message="Loading Photo Strip…"
      submessage="Retrieving photos from cloud storage"
    />
  );
}
