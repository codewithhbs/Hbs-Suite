import { query } from "../lib/db.js";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** ?page=&limit= -> safe integers. Works with Express req.query or URLSearchParams. */
export function pageParams(src = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const get = (k) => (typeof src.get === "function" ? src.get(k) : src[k]);
  const page = Math.max(1, Math.floor(Number(get("page")) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(get("limit") || get("perPage")) || defaultLimit)));
  return { page, limit, offset: (page - 1) * limit };
}

export const meta = (total, { page, limit }) => ({
  total: Number(total) || 0,
  page,
  limit,
  pages: Math.max(1, Math.ceil((Number(total) || 0) / limit)),
});

/**
 * COUNT + page in two queries.
 *   pagedQuery({ select: "c.*", from: "clients c", where: ["c.tenant_id=?"], params: [t], orderBy: "c.id DESC", page })
 */
export async function pagedQuery({ select, from, where = [], params = [], orderBy = null, groupBy = null, countSelect = "COUNT(*)", page }) {
  const w = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const g = groupBy ? ` GROUP BY ${groupBy}` : "";
  const countSql = groupBy
    ? `SELECT COUNT(*) total FROM (SELECT 1 FROM ${from}${w}${g}) x`
    : `SELECT ${countSelect} total FROM ${from}${w}`;
  const lim = Number(page.limit) | 0;
  const off = Number(page.offset) | 0;
  const [countRows, items] = await Promise.all([
    query(countSql, params),
    query(`SELECT ${select} FROM ${from}${w}${g}${orderBy ? ` ORDER BY ${orderBy}` : ""} LIMIT ${lim} OFFSET ${off}`, params),
  ]);
  return { items, ...meta(countRows[0]?.total, page) };
}

/** Builds `(a LIKE ? OR b LIKE ?)` for a search term. */
export function likeAny(columns, term, where, params) {
  const q = String(term || "").trim();
  if (!q) return;
  where.push(`(${columns.map((c) => `${c} LIKE ?`).join(" OR ")})`);
  for (let i = 0; i < columns.length; i++) params.push(`%${q}%`);
}

/** Whitelisted ORDER BY from ?sort= */
export const sortBy = (value, map, fallback) => map[value] || map[fallback];
