'use server';

import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword, setAdminSession, clearAdminSession, requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function loginAction(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: 'default' },
      select: { adminPassword: true, adminPasswordHash: true },
    });

    const stored = event?.adminPasswordHash || event?.adminPassword || 'admin1234';
    const isValid = await verifyPassword(password, stored);

    if (!isValid) {
      return { success: false, error: 'Incorrect admin password' };
    }

    await setAdminSession();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function logoutAction() {
  await clearAdminSession();
  revalidatePath('/admin');
}

export async function changePasswordAction(currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  if (!newPass || newPass.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters' };
  }

  const event = await prisma.event.findUnique({
    where: { id: 'default' },
    select: { adminPassword: true, adminPasswordHash: true },
  });

  const stored = event?.adminPasswordHash || event?.adminPassword || 'admin1234';
  const isValid = await verifyPassword(currentPass, stored);

  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  const newHash = await hashPassword(newPass);

  await prisma.event.update({
    where: { id: 'default' },
    data: {
      adminPasswordHash: newHash,
      adminPassword: null,
    },
  });

  revalidatePath('/admin/security');
  return { success: true };
}
