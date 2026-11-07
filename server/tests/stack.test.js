import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHealthStatus } from '../src/controllers/healthController.js';
import {
  createRequireAuth,
  isLocalE2EBypassAllowed,
  requireAuth,
} from '../src/middleware/auth.js';

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

test('local E2E auth bypass is disabled by default, impossible in production, and restricted to loopback with explicit flag', async () => {
  const loopbackReq = {
    ip: '127.0.0.1',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      authorization: 'Bearer e2e-local-playwright-token',
    },
  };

  // 1. Rejected when ROUTEWISE_ENABLE_LOCAL_E2E_AUTH is absent or false
  assert.equal(
    isLocalE2EBypassAllowed('e2e-local-playwright-token', loopbackReq, {
      NODE_ENV: 'development',
    }),
    false
  );
  assert.equal(
    isLocalE2EBypassAllowed('e2e-local-playwright-token', loopbackReq, {
      NODE_ENV: 'development',
      ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'false',
    }),
    false
  );

  // 2. Rejected when NODE_ENV is production even if ROUTEWISE_ENABLE_LOCAL_E2E_AUTH is true
  assert.equal(
    isLocalE2EBypassAllowed('e2e-local-playwright-token', loopbackReq, {
      NODE_ENV: 'production',
      ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'true',
    }),
    false
  );

  // 3. Rejected when remote IP or Host/Origin header is non-loopback
  assert.equal(
    isLocalE2EBypassAllowed(
      'e2e-local-playwright-token',
      {
        ip: '203.0.113.10',
        headers: { host: 'localhost:3000' },
      },
      {
        NODE_ENV: 'development',
        ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'true',
      }
    ),
    false
  );
  assert.equal(
    isLocalE2EBypassAllowed(
      'e2e-local-playwright-token',
      {
        ip: '127.0.0.1',
        headers: { host: 'ais-dev.run.app', origin: 'https://ais-dev.run.app' },
      },
      {
        NODE_ENV: 'development',
        ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'true',
      }
    ),
    false
  );

  // 4. Allowed ONLY when NODE_ENV !== production, ROUTEWISE_ENABLE_LOCAL_E2E_AUTH === 'true', loopback IP/Host, and exact token
  assert.equal(
    isLocalE2EBypassAllowed('e2e-local-playwright-token', loopbackReq, {
      NODE_ENV: 'development',
      ROUTEWISE_ENABLE_LOCAL_E2E_AUTH: 'true',
    }),
    true
  );

  // 5. Default requireAuth middleware rejects Bearer e2e-local-playwright-token with 401 when flag is not enabled
  const prevFlag = process.env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH;
  delete process.env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH;
  try {
    let statusCode = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    await requireAuth(loopbackReq, res, () => {});
    assert.equal(statusCode, 401);
  } finally {
    if (prevFlag !== undefined) {
      process.env.ROUTEWISE_ENABLE_LOCAL_E2E_AUTH = prevFlag;
    }
  }
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
  assert.equal(
    fs.existsSync(path.join(rootDir, 'server/database/migrations/0002_trip_destination_coordinates.sql')),
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
