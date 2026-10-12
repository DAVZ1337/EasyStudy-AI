# Security Specification for EstudiaFácil AI (Firestore Rules)

## 1. Data Invariants
1. **User Identity Boundary**: Every document under `/users/{userId}/**` can only be read, created, updated, or deleted by the authenticated user whose `request.auth.uid == userId`.
2. **Owner Verification**: Any incoming document in a subcollection must specify `ownerId` identical to `request.auth.uid`.
3. **No Cross-User Access**: Unauthenticated users and other authenticated users cannot access, list, write, or modify documents belonging to another user.
4. **Length and Type Boundaries**: All text fields must comply with type and maximum size constraints (`isValidId`, max string length) to prevent denial-of-wallet resource attacks.
5. **Collection Integrity**: Only authorized subcollections (`subjects`, `flashcards`, `schedule`, `calendar`, `studyFiles`) are permitted under `/users/{userId}`. Root catch-all blocks deny any unauthorized paths.

## 2. The "Dirty Dozen" Payloads (Designed to Break Identity, Integrity & State)
1. **Unauthenticated Read**: An unauthenticated client attempting to list `/users/user123/subjects`. (Expected: Denied).
2. **Cross-User Subject Snooping**: User `attacker_abc` reading `/users/victim_xyz/subjects/math-1`. (Expected: Denied).
3. **Owner Identity Spoofing**: User `attacker_abc` creating a subject with `ownerId: "victim_xyz"` in `/users/attacker_abc/subjects/sub-1`. (Expected: Denied).
4. **Cross-User Injection**: User `attacker_abc` trying to create a flashcard directly in `/users/victim_xyz/flashcards/card-1`. (Expected: Denied).
5. **Path Variable ID Poisoning**: Trying to create a document with a 20KB garbage ID `/users/user123/subjects/malicious_excessively_long_id_...`. (Expected: Denied).
6. **Flashcard Oversized Field Attack**: Trying to inject a 10MB payload in `front` of a flashcard to exceed quotas. (Expected: Denied).
7. **Schedule Day Of Week Tampering**: Submitting a negative or non-integer `dayOfWeek: 999` in schedule slot. (Expected: Denied).
8. **Root Collection Unauthorized Write**: Trying to write directly to `/admin_secrets` or `/system`. (Expected: Denied).
9. **Ghost / Shadow Field Injection**: Updating a subject with an unknown shadow field `__isAdmin: true` or `hacked: 1`. (Expected: Denied).
10. **Calendar Event Non-Boolean Completed**: Updating `completed` in `calendar` to `"yes"` or a nested malicious object instead of a boolean. (Expected: Denied).
11. **Study File Huge Blob Injection**: Attempting to store a 5MB payload in a single Firestore document. (Expected: Denied).
12. **Owner ID Mutation on Update**: Attempting to update a flashcard or subject and changing `ownerId` from `user123` to `attacker_abc`. (Expected: Denied).

## 3. Test Invariants Summary
All 12 dirty payloads are rejected by the Firestore security rules.
