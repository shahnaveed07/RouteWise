import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHealthStatus } from '../src/controllers/healthController.js';
import { createRequireAuth, requireAuth } from '../src/middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('getHealthStatus returns 200 and PERN stack metadata', () => {
  let statusCode = null;
  let body = null;

  const req = {};
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  getHealthStatus(req, res);

  assert.equal(statusCode, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'routewise-api');
  assert.match(body.stack, /PERN/);
});

test('requireAuth rejects missing Authorization header with 401', async () => {
  let statusCode = null;
  let body = null;
  let nextCalled = false;

  const req = { headers: {} };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 401);
  assert.match(body.error, /Unauthorized/i);
});

test('requireAuth rejects demo traveller persona tokens with 401 and does not touch DB', async () => {
  let statusCode = null;
  let body = null;
  let syncCalled = false;

  const middleware = createRequireAuth({
    syncUser: async () => {
      syncCalled = true;
    },
  });

  const req = {
    headers: {
      authorization: 'Bearer demo-naveed',
    },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  await middleware(req, res, () => {});

  assert.equal(syncCalled, false);
  assert.equal(statusCode, 401);
  assert.match(body.error, /Demo preview personas/i);
});

test('requireAuth passes 503 database error to next(err) when valid Firebase token fails PostgreSQL user sync', async () => {
  let statusCode = null;
  let forwardedError = null;

  const middleware = createRequireAuth({
    verifyToken: async () => ({
      uid: 'firebase-uid-123',
      email: 'traveller@routewise.edu',
      name: 'Verified Traveller',
    }),
    syncUser: async () => {
      const dbErr = new Error('Connection terminated unexpectedly');
      dbErr.statusCode = 503;
      throw dbErr;
    },
  });

  const req = {
    headers: {
      authorization: 'Bearer valid-firebase-jwt',
    },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };

  await middleware(req, res, (err) => {
    forwardedError = err;
  });

  // Must NOT return 401 invalid token
  assert.equal(statusCode, null);
  assert.ok(forwardedError instanceof Error);
  assert.equal(forwardedError.statusCode, 503);
  assert.match(forwardedError.message, /Unable to synchronize user account/i);
});

test('workspace enforces React .jsx in client/src, .js in server/src, plain SQL migrations, and zero Prisma/ORM', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'client/src/main.jsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'client/src/App.jsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'client/src/styles/index.css')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'server/server.js')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'server/src/app.js')), true);

  // New plain SQL migration location verified
  assert.equal(
    fs.existsSync(path.join(rootDir, 'server/database/migrations/0001_initial_baseline.sql')),
    true
  );

  // Legacy Prisma directory & schema retired
  assert.equal(fs.existsSync(path.join(rootDir, 'server/prisma/schema.prisma')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'server/prisma')), false);

  // Confirm package.json has pg and zero Prisma/Mongoose dependencies
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  assert.ok(allDeps.pg, 'pg must be installed');
  assert.equal('prisma' in allDeps, false);
  assert.equal('@prisma/client' in allDeps, false);
  assert.equal('mongoose' in allDeps, false);
});
