'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Slot } from '@/types';
import { Prisma } from '@/generated/prisma/client';

export async function addFrameAction(params: {
  name: string;
  dataUrl: string;
  width?: number | null;
  height?: number | null;
  slots: Slot[];
}): Promise<{ success: boolean; frameId?: string; error?: string }> {
  await requireAdmin();

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.frame.updateMany({
        where: { eventId: 'default' },
        data: { isActive: false },
      });

      const frame = await tx.frame.create({
        data: {
          eventId: 'default',
          name: params.name,
          dataUrl: params.dataUrl,
          width: params.width ?? null,
          height: params.height ?? null,
          slots: params.slots as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
      });

      return frame;
    });

    revalidatePath('/');
    revalidatePath('/admin/frames');
    return { success: true, frameId: result.id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function activateFrameAction(frameId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await prisma.$transaction([
      prisma.frame.updateMany({
        where: { eventId: 'default' },
        data: { isActive: false },
      }),
      prisma.frame.update({
        where: { id: frameId },
        data: { isActive: true },
      }),
    ]);

    revalidatePath('/');
    revalidatePath('/admin/frames');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function clearActiveFrameAction(): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await prisma.frame.updateMany({
      where: { eventId: 'default' },
      data: { isActive: false },
    });

    revalidatePath('/');
    revalidatePath('/admin/frames');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function removeFrameAction(frameId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await prisma.frame.delete({
      where: { id: frameId },
    });

    revalidatePath('/');
    revalidatePath('/admin/frames');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateFrameSlotsAction(
  frameId: string,
  patch: { slots: Slot[]; width?: number; height?: number }
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      slots: patch.slots as unknown as Prisma.InputJsonValue,
    };
    if (patch.width !== undefined) data.width = patch.width;
    if (patch.height !== undefined) data.height = patch.height;

    await prisma.frame.update({
      where: { id: frameId },
      data,
    });

    revalidatePath('/');
    revalidatePath('/admin/frames');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
