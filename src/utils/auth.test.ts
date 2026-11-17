import test from 'node:test';
import assert from 'node:assert/strict';
import {
  friendlyAuthError,
  isValidEmail,
  toAuthUser,
  validateCredentials,
} from './auth.ts';

test('toAuthUser maps a Supabase user and passes null through', () => {
  assert.deepEqual(toAuthUser({ id: 'user-1', email: 'a@example.com' } as never), {
    id: 'user-1',
    email: 'a@example.com',
  });
  assert.deepEqual(toAuthUser({ id: 'user-1', email: undefined } as never), {
    id: 'user-1',
    email: null,
  });
  assert.equal(toAuthUser(null), null);
  assert.equal(toAuthUser(undefined), null);
});

test('friendlyAuthError maps provider messages to i18n keys', () => {
  assert.equal(friendlyAuthError('Invalid login credentials'), 'authInvalidCredentials');
  assert.equal(friendlyAuthError('User already registered'), 'authEmailExists');
  assert.equal(
    friendlyAuthError('Password should be at least 6 characters'),
    'authPasswordTooShort',
  );
  assert.equal(
    friendlyAuthError('Unable to validate email address: invalid format'),
    'authInvalidEmail',
  );
  assert.equal(friendlyAuthError('Email not confirmed'), 'authEmailNotConfirmed');
  assert.equal(friendlyAuthError('Something entirely unexpected'), 'authErrorGeneric');
  assert.equal(friendlyAuthError(null), 'authErrorGeneric');
  assert.equal(friendlyAuthError(undefined), 'authErrorGeneric');
});

test('isValidEmail accepts real addresses and rejects junk', () => {
  assert.equal(isValidEmail('adil@example.com'), true);
  assert.equal(isValidEmail('a.b+tag@sub.example.co.uk'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('@example.com'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('  adil@example.com  '), true);
});

test('validateCredentials checks email first, then password length', () => {
  assert.equal(validateCredentials('bad', 'short'), 'authInvalidEmail');
  assert.equal(validateCredentials('a@example.com', '12345'), 'authPasswordTooShort');
  assert.equal(validateCredentials('a@example.com', '123456'), null);
});
