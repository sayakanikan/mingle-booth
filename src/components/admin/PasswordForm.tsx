'use client';

import React, { useState } from 'react';
import { changePasswordAction } from '@/actions/auth';
import { useToast } from '@/components/ui/Toast';

export function PasswordForm() {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (newPass.length < 4) {
      toast('Password must be at least 4 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await changePasswordAction(currentPass, newPass);
      if (res.success) {
        toast('Admin password updated successfully!', 'success');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        toast(res.error || 'Failed to change password', 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold font-sans">Admin Security & Password</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Manage access credentials for the Admin Dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass max-w-lg p-6 rounded-3xl flex flex-col gap-4 border border-white/10">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            New Password
          </label>
          <input
            type="password"
            required
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="flex justify-end mt-2">
          <button type="submit" disabled={saving} className="btn btn-primary px-8">
            {saving ? 'Updating…' : '🔒 Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
