import React from 'react';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

export default function EventsLoading() {
  return (
    <LoadingOverlay
      message="Loading Events & Gallery…"
      submessage="Fetching events from database"
    />
  );
}
