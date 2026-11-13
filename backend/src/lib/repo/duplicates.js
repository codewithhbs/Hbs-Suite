import { query } from "../db.js";

/**
 * Duplicate clients left behind by failed / repeated Google connects.
 *
 * A) Same Google listing linked to 2+ clients (google_location_name equal):
 *    keeper = most work (posts + AI tasks + calendar slots), then oldest.
 *    Other copies: EMPTY ones are deleted, copies WITH work are unlinked
 *    (become "Not connected", their posts/history stay untouched).
 *
 * B) Same business name + city, not linked, nothing on them:
 *    deleted when a linked / used copy exists, otherwise the oldest is kept.
 *
 * Never deletes a client that has posts, AI tasks or calendar slots.
 */
const WORK = `(SELECT COUNT(*) FROM ai_tasks t WHERE t.client_id=c.id) AS tasks,
              (SELECT COUNT(*) FROM gmb_posts p WHERE p.client_id=c.id) AS posts,
              (SELECT COUNT(*) FROM content_calendar k WHERE k.client_id=c.id) AS slots`;
const work = (r) => Number(r.tasks) + Number(r.posts) + Number(r.slots);

async function linkedGroups(tenantId) {
  const rows = await query(
    `SELECT c.id, c.business_name, c.city, c.google_location_name, ${WORK}
       FROM clients c
      WHERE c.tenant_id=? AND c.google_location_name IN (
              SELECT google_location_name FROM clients
               WHERE tenant_id=? AND google_location_name IS NOT NULL
               GROUP BY google_location_name HAVING COUNT(*) > 1)
      ORDER BY c.google_location_name, c.id`,
    [tenantId, tenantId],
  );
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.google_location_name)) groups.set(r.google_location_name, []);
    groups.get(r.google_location_name).push(r);
  }
  const out = [];
  for (const [location, list] of groups) {
    const keeper = [...list].sort((a, b) => work(b) - work(a) || a.id - b.id)[0];
    const others = list.filter((r) => r !== keeper);
    out.push({
      type: "same_listing",
      location,
      business_name: keeper.business_name,
      city: keeper.city,
      total: list.length,
      keep: [keeper.id],
      remove: others.filter((r) => !work(r)).map((r) => r.id),
      unlink: others.filter((r) => work(r)).map((r) => r.id),
    });
  }
  return out;
}

async function nameGroups(tenantId, ignore = new Set()) {
  const rows = await query(
    `SELECT c.id, c.business_name, c.city,
            c.google_location_name IS NOT NULL AS linked,
            c.google_refresh_token IS NOT NULL AS has_token,
            ${WORK},
            LOWER(TRIM(c.business_name)) AS k_name, LOWER(TRIM(COALESCE(c.city,''))) AS k_city
       FROM clients c
      WHERE c.tenant_id=?
        AND (LOWER(TRIM(c.business_name)), LOWER(TRIM(COALESCE(c.city,'')))) IN (
              SELECT LOWER(TRIM(business_name)), LOWER(TRIM(COALESCE(city,'')))
                FROM clients WHERE tenant_id=?
               GROUP BY LOWER(TRIM(business_name)), LOWER(TRIM(COALESCE(city,'')))
              HAVING COUNT(*) > 1)
      ORDER BY k_name, k_city, c.id`,
    [tenantId, tenantId],
  );
  const groups = new Map();
  for (const r of rows) {
    if (ignore.has(r.id)) continue; // already handled by the same-listing pass
    const key = `${r.k_name}|${r.k_city}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const used = (r) => Number(r.linked) || Number(r.has_token) || work(r);
    const kept = list.filter(used);
    const extra = list.filter((r) => !used(r));
    const drop = kept.length ? extra : extra.slice(1); // nothing used -> keep the oldest
    if (!drop.length) continue;
    out.push({
      type: "same_name",
      business_name: list[0].business_name,
      city: list[0].city,
      total: list.length,
      keep: list.filter((r) => !drop.includes(r)).map((r) => r.id),
      remove: drop.map((r) => r.id),
      unlink: [],
    });
  }
  return out;
}

export async function findDuplicateClients(tenantId) {
  const linked = await linkedGroups(tenantId);
  const touched = new Set(linked.flatMap((g) => [...g.remove, ...g.unlink]));
  const named = await nameGroups(tenantId, touched);
  const groups = [...linked, ...named];
  return {
    removable: groups.flatMap((g) => g.remove),
    unlinkable: groups.flatMap((g) => g.unlink),
    groups,
  };
}

/** Applies findDuplicateClients() (re-computed server side, never trusts the browser). */
export async function removeDuplicateClients(tenantId) {
  const { removable, unlinkable, groups } = await findDuplicateClients(tenantId);
  for (let i = 0; i < unlinkable.length; i += 200) {
    const ids = unlinkable.slice(i, i + 200);
    await query(
      `UPDATE clients SET google_location_name=NULL, google_account_id=NULL, gmb_location_id=NULL,
              google_refresh_token=NULL, gmb_connection_status='MOCK_CONNECTED'
        WHERE tenant_id=? AND id IN (${ids.map(() => "?").join(",")})`,
      [tenantId, ...ids],
    );
    await query(`UPDATE gmb_profiles SET provider='mock', connection_status='MOCK_CONNECTED' WHERE client_id IN (${ids.map(() => "?").join(",")})`, ids);
  }
  for (let i = 0; i < removable.length; i += 200) {
    const ids = removable.slice(i, i + 200);
    await query(`DELETE FROM clients WHERE tenant_id=? AND id IN (${ids.map(() => "?").join(",")})`, [tenantId, ...ids]);
  }
  return { removed: removable.length, unlinked: unlinkable.length, groups };
}