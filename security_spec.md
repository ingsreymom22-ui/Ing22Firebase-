# Security Specification - DPS Staff Portal

## Data Invariants
1. A user's data can only be accessed by that specific authenticated user.
2. Data must follow the `AppData` schema (contains students, settings, attendance, etc.).
3. Document IDs must be valid alphanumeric strings.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to write to `/users/other_user_id/appData/data` while logged in as `my_user_id`.
2. **Unauthenticated Write**: Attempt to write data without being logged in.
3. **Malicious ID**: Attempt to use a document ID that is 2KB in size.
4. **Invalid Structure**: Attempt to write a string where an object (settings) is expected.
5. **PII Leak**: Attempt to read another user's private settings.
6. **Time-Based Bypass**: Attempt to write with a spoofed client-side timestamp (if used).
7. **Ghost Fields**: Attempt to add hidden admin flags to the AppData object.
8. **Recursive Cost Attack**: Attempting many nested collection lookups.
9. **Type Confusion**: Sending an integer where an array (students) is expected.
10. **Empty Payload**: Sending a write with required keys missing.
11. **Huge String**: Sending a 1MB string into a small text field.
12. **Cross-Tenant Access**: Attempting to query across all users' collections.

## Test Runner Logic
All payloads above must result in `PERMISSION_DENIED`.
