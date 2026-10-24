export interface Slot {
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Frame {
  id: string;
  name: string;
  dataUrl: string;
  width: number | null;
  height: number | null;
  slots: Slot[];
  isActive?: boolean;
}

export interface EventData {
  id: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  createdAt: string;
  sessionCount?: number;
}

export interface BoothSettings {
  eventId?: string | null;
  hasActiveEvent?: boolean;
  cameraDeviceId: string | null;
  cameraResolution: string;
  mirrorCamera: boolean;
  mirrorResult?: boolean;
  eventTitle: string;
  eventSubtitle: string;
  brandLogoDataUrl: string | null;
  stripLayout: string;
  stripBgColor: string;
  stripTextColor: string;
  stripShowTitle: boolean;
  stripShowDate: boolean;
  activeFrame: Frame | null;
  frames: Frame[];
}

export interface SessionPhotoData {
  slotIndex: number;
  url: string;
  slotX: number;
  slotY: number;
  slotW: number;
  slotH: number;
}

export interface SessionData {
  id: string;
  layout: string;
  photoCount: number;
  stripUrl: string;
  gifUrl: string | null;
  viewerUrl: string | null;
  stripW: number;
  stripH: number;
  frameUrl: string | null;
  createdAt?: string | Date;
  photos?: SessionPhotoData[];
}
