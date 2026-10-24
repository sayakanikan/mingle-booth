'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { BoothSettings } from '@/types';

export async function updateSettingsAction(patch: Partial<BoothSettings>): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    if (patch.cameraDeviceId !== undefined) data.cameraDeviceId = patch.cameraDeviceId;
    if (patch.cameraResolution !== undefined) data.cameraResolution = patch.cameraResolution;
    if (patch.mirrorCamera !== undefined) data.mirrorCamera = patch.mirrorCamera;
    if (patch.mirrorResult !== undefined) data.mirrorResult = patch.mirrorResult;
    if (patch.eventTitle !== undefined) data.title = patch.eventTitle;
    if (patch.eventSubtitle !== undefined) data.subtitle = patch.eventSubtitle;
    if (patch.brandLogoDataUrl !== undefined) data.brandLogoUrl = patch.brandLogoDataUrl;
    if (patch.stripLayout !== undefined) data.defaultLayout = patch.stripLayout;
    if (patch.stripBgColor !== undefined) data.stripBgColor = patch.stripBgColor;
    if (patch.stripTextColor !== undefined) data.stripTextColor = patch.stripTextColor;
    if (patch.stripShowTitle !== undefined) data.stripShowTitle = patch.stripShowTitle;
    if (patch.stripShowDate !== undefined) data.stripShowDate = patch.stripShowDate;

    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });
    const targetId = activeEvent?.id || 'default';

    await prisma.event.upsert({
      where: { id: targetId },
      create: { id: targetId, isActive: true, ...data },
      update: data,
    });

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/events');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
