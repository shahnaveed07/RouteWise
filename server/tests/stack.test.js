import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHealthStatus } from '../src/controllers/healthController.js';

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

test('workspace enforces React .jsx in client/src and .js in server/src with Prisma schema', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'client/src/main.jsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'client/src/App.jsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'client/src/styles/index.css')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'server/server.js')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'server/src/app.js')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'server/prisma/schema.prisma')), true);
});
