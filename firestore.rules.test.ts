// Firestore Security Rules Test Spec
// Verifies that unauthenticated and cross-user operations are strictly PERMISSION_DENIED.

export interface DirtyDozenTestItem {
  id: number;
  description: string;
  expectedStatus: 'PERMISSION_DENIED';
  path: string;
  authUid: string | null;
  payload?: Record<string, unknown>;
  method: 'get' | 'list' | 'create' | 'update' | 'delete';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestItem[] = [
  {
    id: 1,
    description: 'Unauthenticated Read on subjects',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/subjects',
    authUid: null,
    method: 'list',
  },
  {
    id: 2,
    description: 'Cross-User reading another user subject',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/victim_xyz/subjects/math-1',
    authUid: 'attacker_abc',
    method: 'get',
  },
  {
    id: 3,
    description: 'Owner Identity Spoofing in subject create',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/attacker_abc/subjects/sub-1',
    authUid: 'attacker_abc',
    payload: { id: 'sub-1', ownerId: 'victim_xyz', name: 'Fake Math', color: '#123456', icon: '📐' },
    method: 'create',
  },
  {
    id: 4,
    description: 'Cross-User creation of flashcard in another user space',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/victim_xyz/flashcards/card-1',
    authUid: 'attacker_abc',
    payload: { id: 'card-1', ownerId: 'attacker_abc', subjectId: 's1', front: 'Q', back: 'A', difficulty: 'facil' },
    method: 'create',
  },
  {
    id: 5,
    description: 'Path ID poisoning attack (>128 chars)',
    expectedStatus: 'PERMISSION_DENIED',
    path: `/users/user123/subjects/${'a'.repeat(200)}`,
    authUid: 'user123',
    payload: { id: 'a'.repeat(200), ownerId: 'user123', name: 'Invalid', color: '#fff', icon: '📚' },
    method: 'create',
  },
  {
    id: 6,
    description: 'Flashcard oversized field attack',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/flashcards/card-large',
    authUid: 'user123',
    payload: { id: 'card-large', ownerId: 'user123', subjectId: 's1', front: 'x'.repeat(50000), back: 'y', difficulty: 'facil' },
    method: 'create',
  },
  {
    id: 7,
    description: 'Schedule slot invalid dayOfWeek',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/schedule/slot-bad',
    authUid: 'user123',
    payload: { id: 'slot-bad', ownerId: 'user123', dayOfWeek: 999, startTime: '08:00', endTime: '09:00', subjectId: 's1' },
    method: 'create',
  },
  {
    id: 8,
    description: 'Root collection unauthorized write',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/admin_secrets/passwords',
    authUid: 'user123',
    payload: { secret: 'leak' },
    method: 'create',
  },
  {
    id: 9,
    description: 'Shadow field injection on subject update',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/subjects/sub-1',
    authUid: 'user123',
    payload: { __isAdmin: true },
    method: 'update',
  },
  {
    id: 10,
    description: 'Calendar event non-boolean completed',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/calendar/event-1',
    authUid: 'user123',
    payload: { completed: 'not_a_boolean' },
    method: 'update',
  },
  {
    id: 11,
    description: 'Study file huge blob injection',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/studyFiles/file-huge',
    authUid: 'user123',
    payload: { id: 'file-huge', ownerId: 'user123', name: 'f.pdf', mimeType: 'app/pdf', dataUrl: 'x'.repeat(1200000) },
    method: 'create',
  },
  {
    id: 12,
    description: 'Owner ID mutation on update',
    expectedStatus: 'PERMISSION_DENIED',
    path: '/users/user123/flashcards/card-1',
    authUid: 'user123',
    payload: { ownerId: 'attacker_abc' },
    method: 'update',
  },
];
