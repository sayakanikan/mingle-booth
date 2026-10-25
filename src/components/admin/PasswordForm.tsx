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
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Admin Security & Password</h2>
        <p className="text-sm text-zinc-400 mt-1.5">
          Manage credentials used to unlock the Admin Dashboard and change configurations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass max-w-xl p-6 sm:p-8 rounded-3xl flex flex-col gap-6 border border-white/10 shadow-xl">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono"
          />
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            New Password
          </label>
          <input
            type="password"
            required
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="At least 4 characters"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Repeat new password"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary px-8 py-3 text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                <span>Updating Password…</span>
              </>
            ) : (
              '🔒 Update Password'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
