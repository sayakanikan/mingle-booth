---
name: verify-changes
description: Use this skill to verify code changes before completing tasks on Mingle Booth.
---

# Change Verification Procedure

Execute these automated and manual verification checks:

1. **Type Checking**:
   ```bash
   npm run typecheck
   ```
2. **Build Validation**:
   ```bash
   npm run build
   ```
3. **Smoke Tests**:
   Refer to [smoke-checklist.md](./references/smoke-checklist.md) to verify booth and admin flows.
