/**
 * BrainHive Preservation Property Tests
 *
 * These tests verify currently-working behaviors that must NOT regress after
 * fixes are applied. They use static source-code analysis (fs.readFileSync)
 * so they can run without a live MySQL database.
 *
 * IMPORTANT: These tests are EXPECTED TO PASS on the unfixed code.
 * They confirm the baseline behavior that must be preserved throughout all fixes.
 *
 * Validates: Requirements 3.1–3.10
 */

const fs = require('fs');
const path = require('path');

// ─── helpers ────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ─── source files loaded once ────────────────────────────────────────────────

const serverJs = readSrc('backend/server.js');
const appJsx   = readSrc('frontend/src/App.jsx');

// ════════════════════════════════════════════════════════════════════════════
// BACKEND API ROUTES (3.1 – 3.9)
// ════════════════════════════════════════════════════════════════════════════

describe('Preservation: backend API routes exist in server.js', () => {

  /**
   * 3.1 — POST /register route exists
   * Validates: Requirements 3.1
   */
  test('3.1 POST /register route is defined', () => {
    expect(serverJs).toMatch(/app\.post\s*\(\s*['"]\/register['"]/);
  });

  /**
   * 3.2 — POST /login route exists
   * Validates: Requirements 3.2
   */
  test('3.2 POST /login route is defined', () => {
    expect(serverJs).toMatch(/app\.post\s*\(\s*['"]\/login['"]/);
  });

  /**
   * 3.3 — POST /groups route exists
   * Validates: Requirements 3.3
   */
  test('3.3 POST /groups route is defined', () => {
    expect(serverJs).toMatch(/app\.post\s*\(\s*['"]\/groups['"]/);
  });

  /**
   * 3.4 — POST /group-membership route exists
   * Validates: Requirements 3.4
   */
  test('3.4 POST /group-membership route is defined', () => {
    expect(serverJs).toMatch(/app\.post\s*\(\s*['"]\/group-membership['"]/);
  });

  /**
   * 3.5 — POST /messages route exists
   * Validates: Requirements 3.5
   */
  test('3.5 POST /messages route is defined', () => {
    expect(serverJs).toMatch(/app\.post\s*\(\s*['"]\/messages['"]/);
  });

  /**
   * 3.6 — GET /groups route exists
   * Validates: Requirements 3.6
   */
  test('3.6 GET /groups route is defined', () => {
    expect(serverJs).toMatch(/app\.get\s*\(\s*['"]\/groups['"]/);
  });

  /**
   * 3.7 — GET /groups/user/:userId route exists
   * Validates: Requirements 3.7
   */
  test('3.7 GET /groups/user/:userId route is defined', () => {
    expect(serverJs).toMatch(/app\.get\s*\(\s*['"]\/groups\/user\/:userId['"]/);
  });

  /**
   * 3.8 — GET /messages route with groupId query exists
   * Validates: Requirements 3.8
   */
  test('3.8 GET /messages route (with groupId query) is defined', () => {
    expect(serverJs).toMatch(/app\.get\s*\(\s*['"]\/messages['"]/);
    // The handler reads groupId from req.query
    expect(serverJs).toMatch(/req\.query/);
  });

  /**
   * 3.9 — POST /sessions route exists
   * Validates: Requirements 3.9
   */
  test('3.9 POST /sessions route is defined', () => {
    expect(serverJs).toMatch(/app\.post\s*\(\s*['"]\/sessions['"]/);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND ROUTES (3.10)
// ════════════════════════════════════════════════════════════════════════════

describe('Preservation: frontend routes defined in App.jsx', () => {

  /**
   * 3.10a — /home route exists
   * Validates: Requirements 3.10
   */
  test('3.10a App.jsx defines a route for /home', () => {
    expect(appJsx).toMatch(/path=["']\/home["']/);
  });

  /**
   * 3.10b — /create-group route exists
   * Validates: Requirements 3.10
   */
  test('3.10b App.jsx defines a route for /create-group', () => {
    expect(appJsx).toMatch(/path=["']\/create-group["']/);
  });

  /**
   * 3.10c — /join-group route exists
   * Validates: Requirements 3.10
   */
  test('3.10c App.jsx defines a route for /join-group', () => {
    expect(appJsx).toMatch(/path=["']\/join-group["']/);
  });

  /**
   * 3.10d — /messages route exists
   * Validates: Requirements 3.10
   */
  test('3.10d App.jsx defines a route for /messages', () => {
    expect(appJsx).toMatch(/path=["']\/messages["']/);
  });

  /**
   * 3.10e — /sessions route exists
   * Validates: Requirements 3.10
   */
  test('3.10e App.jsx defines a route for /sessions', () => {
    expect(appJsx).toMatch(/path=["']\/sessions["']/);
  });

});
