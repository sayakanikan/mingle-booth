import React from 'react';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

export default function AdminLoading() {
  return (
    <LoadingOverlay
      message="Loading Dashboard…"
      submessage="Preparing admin configurations"
    />
  );
}
