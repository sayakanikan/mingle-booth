---
name: add-admin-section
description: Use this skill when creating or extending sections in the Mingle Booth Admin Dashboard (/admin/*).
---

# Adding Admin Dashboard Sections

To add a new admin configuration or management view:

1. **Page Route**: Create `src/app/admin/<section>/page.tsx`. This should be a Server Component that fetches initial data using `@/lib/db`.
2. **Component Form**: Create `src/components/admin/<Section>Form.tsx` as a Client Component (`'use client'`) using Tailwind UI primitives in `@/components/ui`.
3. **Server Action**: Add actions to `src/actions/<section>.ts` (marked with `'use server'`).
   - Every action MUST begin with:
     ```ts
     await requireAdmin();
     ```
   - End with revalidating relevant paths:
     ```ts
     revalidatePath('/admin/<section>');
     revalidatePath('/'); // If setting impacts kiosk
     ```
4. **Navigation**: Add the section entry to `src/components/admin/AdminNav.tsx` with its icon and label.
5. **Verification**: Verify that unauthorized visits redirect to `/admin/login`.
