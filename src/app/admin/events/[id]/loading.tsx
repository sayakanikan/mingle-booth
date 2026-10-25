import React from 'react';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

export default function EventDetailLoading() {
  return (
    <LoadingOverlay
      message="Loading Photo Gallery…"
      submessage="Retrieving event photo strips and memories"
    />
  );
}
