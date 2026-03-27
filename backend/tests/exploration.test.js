/**
 * BrainHive Bug Condition Exploration Tests
 *
 * These tests document all 16 defects identified in the BrainHive codebase.
 * They perform static source-code analysis (reading files and checking patterns)
 * so they can run without a live MySQL database.
 *
 * IMPORTANT: These tests are EXPECTED TO FAIL on the unfixed code.
 * Failure = the bug exists (which is the success condition for this task).
 * They will pass once the corresponding fixes are applied.
 *
 * Validates: Requirements 1.1–1.16
 */

const fs = require('fs');
const path = require('path');

// ─── helpers ────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ─── source files loaded once ────────────────────────────────────────────────

const serverJs        = readSrc('backend/server.js');
const appJsx          = readSrc('frontend/src/App.jsx');
const dashboardJsx    = readSrc('frontend/src/components/Dashboard.jsx');
const messageModalJsx = readSrc('frontend/src/components/MessageModal.jsx');
const createGroupJsx  = readSrc('frontend/src/components/CreateGroupPage.jsx');
const groupHomeJsx    = readSrc('frontend/src/components/GroupHomePage.jsx');
const groupChatJsx    = readSrc('frontend/src/components/GroupChat.jsx');

// ════════════════════════════════════════════════════════════════════════════
// SECURITY DEFECTS (1.1 – 1.4)
// ════════════════════════════════════════════════════════════════════════════

describe('Security defects', () => {

  /**
   * Defect 1.1 — Plain-text password storage
   * server.js register handler must import and use bcrypt.hash before INSERT.
   * On unfixed code: bcrypt is never imported → test FAILS.
   */
  test('1.1 register handler uses bcrypt to hash passwords (not plain text)', () => {
    // The fixed code must import bcrypt
    expect(serverJs).toMatch(/require\(['"]bcrypt['"]\)/);
    // The fixed code must call bcrypt.hash (or bcrypt.hashSync) in the register handler
    expect(serverJs).toMatch(/bcrypt\.(hash|hashSync)\s*\(/);
  });

  /**
   * Defect 1.2 — Login compares passwords without bcrypt
   * On unfixed code: login uses `results[0].password !== password` (plain ==) → test FAILS.
   */
  test('1.2 login handler uses bcrypt.compare (not plain string equality)', () => {
    expect(serverJs).toMatch(/bcrypt\.compare\s*\(/);
    // Must NOT rely on plain string comparison for auth
    expect(serverJs).not.toMatch(/results\[0\]\.password\s*!==\s*password/);
  });

  /**
   * Defect 1.3 — All routes are unprotected (no JWT middleware)
   * On unfixed code: jsonwebtoken is never imported and no verifyToken middleware exists → test FAILS.
   */
  test('1.3 server applies JWT middleware to protect routes', () => {
    // Must import jsonwebtoken
    expect(serverJs).toMatch(/require\(['"]jsonwebtoken['"]\)/);
    // Must define or use a verifyToken / authenticateToken middleware
    expect(serverJs).toMatch(/verifyToken|authenticateToken|jwt\.verify/);
    // At least one route must use the middleware
    expect(serverJs).toMatch(/app\.(get|post|put|delete)\s*\([^)]*verifyToken|app\.(get|post|put|delete)\s*\([^)]*authenticateToken/);
  });

  /**
   * Defect 1.4 — No input validation on register/login
   * On unfixed code: register does a bare INSERT with no length/empty checks → test FAILS.
   */
  test('1.4 register and login handlers validate input fields', () => {
    // The fixed register handler must check for missing/empty fields and return 400
    // Look for a 400 response in the register block
    expect(serverJs).toMatch(/status\(400\)/);
    // Must check that required fields are present (truthy check or explicit validation)
    expect(serverJs).toMatch(/!name|!email|!password|name\.trim|email\.trim|password\.trim|name\.length|password\.length/);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// BROKEN / DEAD CODE DEFECTS (1.5 – 1.9)
// ════════════════════════════════════════════════════════════════════════════

describe('Broken / dead code defects', () => {

  /**
   * Defect 1.5 — Dashboard.jsx uses wrong port (5000 instead of 3001)
   * On unfixed code: Dashboard.jsx contains 'localhost:5000' → test FAILS.
   */
  test('1.5 Dashboard.jsx targets port 3001, not 5000', () => {
    expect(dashboardJsx).not.toMatch(/localhost:5000/);
    expect(dashboardJsx).toMatch(/localhost:3001/);
  });

  /**
   * Defect 1.6 — Header and Dashboard are dead components (never imported in App.jsx)
   * On unfixed code: App.jsx does not import Header or Dashboard → test FAILS.
   */
  test('1.6 App.jsx imports and uses Header and Dashboard components', () => {
    expect(appJsx).toMatch(/import\s+.*Header.*from/);
    expect(appJsx).toMatch(/import\s+.*Dashboard.*from/);
    // They must also be rendered (JSX usage)
    expect(appJsx).toMatch(/<Header[\s/>]/);
    expect(appJsx).toMatch(/<Dashboard[\s/>]/);
  });

  /**
   * Defect 1.7 — Missing GET /groups/:groupId endpoint in backend
   * On unfixed code: server.js has no route for a single group by ID → test FAILS.
   */
  test('1.7 server.js defines GET /groups/:groupId (single group) endpoint', () => {
    // Must have a GET route that captures a groupId / :id / :groupId parameter
    // (distinct from GET /groups/user/:userId which already exists)
    expect(serverJs).toMatch(/app\.get\s*\(\s*['"]\/groups\/:(?:groupId|id)['"]/);
  });

  /**
   * Defect 1.8 — MessageModal.jsx omits userId from POST /messages body
   * On unfixed code: the POST body only has { groupId, message } — no userId → test FAILS.
   */
  test('1.8 MessageModal.jsx includes userId in POST /messages request body', () => {
    expect(messageModalJsx).toMatch(/userId\s*:/);
  });

  /**
   * Defect 1.9 — CreateGroupPage.jsx makes a redundant POST /group-membership call
   * On unfixed code: CreateGroupPage calls POST /group-membership after POST /groups → test FAILS.
   * (The backend already inserts the creator into group_membership during POST /groups.)
   */
  test('1.9 CreateGroupPage.jsx does NOT make a redundant POST /group-membership call', () => {
    expect(createGroupJsx).not.toMatch(/post\s*\(\s*['"`]http:\/\/localhost:3001\/group-membership['"`]/);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// MISSING / INCOMPLETE FEATURE DEFECTS (1.10 – 1.15)
// ════════════════════════════════════════════════════════════════════════════

describe('Missing / incomplete feature defects', () => {

  /**
   * Defect 1.10 — No accept/reject endpoint for join requests
   * On unfixed code: server.js has no PUT route for group membership → test FAILS.
   */
  test('1.10 server.js defines a PUT route to accept/reject group membership', () => {
    expect(serverJs).toMatch(/app\.put\s*\(\s*['"]\/groups\//);
  });

  /**
   * Defect 1.11 — GroupHomePage.jsx has no functional member list rendering
   * The component has JSX for members but it calls a non-existent GET /groups/:groupId
   * endpoint (defect 1.7), so the member list never actually renders.
   * The fix requires the component to use Redux state (useSelector) to get members
   * from the store, which is populated by the new GET /groups/:groupId endpoint.
   * On unfixed code: GroupHomePage uses local axios + useState, not useSelector → test FAILS.
   */
  test('1.11 GroupHomePage.jsx reads member list from Redux store (useSelector)', () => {
    // The fixed component must use useSelector to get group/member data from Redux
    expect(groupHomeJsx).toMatch(/useSelector/);
    // Must NOT rely on a local useState for groupDetails (replaced by Redux)
    expect(groupHomeJsx).not.toMatch(/useState.*groupDetails|groupDetails.*useState/);
  });

  /**
   * Defect 1.12 — No polling mechanism in GroupChat.jsx or MessageModal.jsx
   * On unfixed code: neither component uses setInterval → test FAILS.
   */
  test('1.12 GroupChat.jsx or MessageModal.jsx uses setInterval for message polling', () => {
    const hasPollingInChat  = /setInterval/.test(groupChatJsx);
    const hasPollingInModal = /setInterval/.test(messageModalJsx);
    expect(hasPollingInChat || hasPollingInModal).toBe(true);
  });

  /**
   * Defect 1.13 — No navigation link to /sessions in the logged-in UI
   * On unfixed code: App.jsx logged-in nav has no link/button to /sessions → test FAILS.
   * (The /sessions route exists but is only reachable right after group creation.)
   */
  test('1.13 App.jsx provides a navigation link/button to /sessions in the logged-in UI', () => {
    // The logged-in section must have a button or link that navigates to /sessions
    expect(appJsx).toMatch(/navigate\s*\(\s*['"]\/sessions['"]\)|to\s*=\s*['"]\/sessions['"]/);
    // And it must appear in the logged-in branch (after the loggedInUser check)
    // Simple heuristic: the string '/sessions' must appear in a button/navigate call
    // outside of just the Route definition
    const sessionNavCount = (appJsx.match(/['"]\/sessions['"]/g) || []).length;
    // At minimum 2 occurrences: one for the Route, one for the nav button
    expect(sessionNavCount).toBeGreaterThanOrEqual(2);
  });

  /**
   * Defect 1.14 — No toast/notification system
   * On unfixed code: no component imports a toast or notification library → test FAILS.
   */
  test('1.14 at least one component imports or uses a toast/notification system', () => {
    const allSrc = [appJsx, dashboardJsx, messageModalJsx, createGroupJsx, groupHomeJsx, groupChatJsx].join('\n');
    // Check for common toast libraries or a custom Notification component
    const hasToast = /toast|notification|Notification|addNotification|react-toastify|react-hot-toast/i.test(allSrc);
    expect(hasToast).toBe(true);
  });

  /**
   * Defect 1.15 — /home route renders only a static "Welcome Home" heading
   * On unfixed code: App.jsx /home route is `<h2>Welcome Home</h2>` with no dashboard → test FAILS.
   */
  test('1.15 /home route renders Dashboard component, not just a static heading', () => {
    // The /home route must render <Dashboard> (or equivalent), not a bare <h2>
    expect(appJsx).not.toMatch(/<Route\s[^>]*path=["']\/home["'][^>]*element=\{<h2>/);
    // And Dashboard must be used at /home
    expect(appJsx).toMatch(/path=["']\/home["'][^}]*Dashboard|Dashboard[^}]*path=["']\/home["']/);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT DEFECT (1.16)
// ════════════════════════════════════════════════════════════════════════════

describe('State management defect', () => {

  /**
   * Defect 1.16 — Prop-drilling: App.jsx passes user/groups as props to children
   * On unfixed code: App.jsx has useState for loggedInUser/groups and passes them as props → test FAILS.
   */
  test('1.16 App.jsx does NOT prop-drill user/groups state (uses Redux useSelector instead)', () => {
    // Fixed code must import useSelector from react-redux
    expect(appJsx).toMatch(/useSelector/);
    // Fixed code must NOT have useState for loggedInUser (state moved to Redux)
    expect(appJsx).not.toMatch(/useState.*loggedInUser|loggedInUser.*useState/);
    // Fixed code must NOT pass loggedInUser as a prop to child components
    expect(appJsx).not.toMatch(/loggedInUser=\{loggedInUser\}/);
  });

});
