import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_EMAIL,
  isAdminUserEmail,
  updateUserPro,
  type AdminUser,
} from './admin.ts';

test('isAdminUserEmail only accepts the operator account', () => {
  assert.equal(ADMIN_EMAIL, 'adiltariq0327@gmail.com');
  assert.equal(isAdminUserEmail('adiltariq0327@gmail.com'), true);
  assert.equal(isAdminUserEmail('AdilTariq0327@Gmail.com'), true);
  assert.equal(isAdminUserEmail('  adiltariq0327@gmail.com  '), true);
  assert.equal(isAdminUserEmail('someone-else@gmail.com'), false);
  assert.equal(isAdminUserEmail(null), false);
  assert.equal(isAdminUserEmail(undefined), false);
});

test('updateUserPro flips only the targeted user', () => {
  const users: AdminUser[] = [
    { id: 'u1', email: 'a@example.com', is_pro: false, created_at: '2026-11-18T00:00:00Z' },
    { id: 'u2', email: 'b@example.com', is_pro: true, created_at: '2026-11-17T00:00:00Z' },
  ];
  const updated = updateUserPro(users, 'u1', true);
  assert.equal(updated[0].is_pro, true);
  assert.equal(updated[1].is_pro, true); // untouched
  assert.equal(users[0].is_pro, false); // input not mutated
  const removed = updateUserPro(updated, 'u2', false);
  assert.equal(removed[1].is_pro, false);
  assert.deepEqual(updateUserPro(users, 'missing-id', true), users);
});
