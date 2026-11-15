const fs = require('node:fs/promises');
const path = require('node:path');
const { HttpError } = require('./domain.cjs');
const RETENTION_DAYS = 30;
const UUID_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i;

// Only expired per-applicant runtime JSON files. Never touch model files, audit
// history, recommendations, saved matches, directories or symbolic links.
async function expiredMatchingCache(directory, { execute = false, now = Date.now(), protect = () => false, removed = () => {} } = {}) {
  const root = path.resolve(directory);
  let entries;
  try {
    const realRoot = await fs.realpath(root);
    const same = process.platform === 'win32' ? realRoot.toLowerCase() === root.toLowerCase() : realRoot === root;
    if (!same) throw new HttpError(400, 'Cache cleanup cannot follow a redirected directory.');
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) { if (error.code === 'ENOENT') return { eligible: 0, removed: 0, retentionDays: RETENTION_DAYS }; throw error; }
  const cutoff = now - RETENTION_DAYS * 86400000;
  let eligible = 0, cleared = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !UUID_FILE.test(entry.name)) continue;
    const id = entry.name.slice(0, -5), target = path.resolve(root, entry.name);
    if (path.dirname(target) !== root || protect(id, cutoff)) continue;
    try {
      const stat = await fs.lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.mtimeMs >= cutoff || protect(id, cutoff)) continue;
      eligible++;
      if (execute) { await fs.unlink(target); removed(id); cleared++; }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { eligible, removed: cleared, retentionDays: RETENTION_DAYS };
}
module.exports = { expiredMatchingCache, RETENTION_DAYS };
