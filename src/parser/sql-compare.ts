import crypto from "crypto";
import { Parser } from "node-sql-parser";

export type SqlDialect = "postgresql" | "mysql" | "bigquery" | "snowflake";

export type SqlCompareResult = {
  ok: true;
  ast: unknown;
  canonicalJson: string;
  structuralHash: string;
} | {
  ok: false;
  error: string;
};

const parser = new Parser();

const COMMUTATIVE_OPERATORS = new Set(["+", "*", "AND", "OR"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Remove parser-specific noise so hashes are stable across equivalent parses.
 */
function stripVolatileAstFields(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripVolatileAstFields);
  }
  if (!isPlainObject(node)) {
    return node;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "loc" || k === "location" || k === "parentheses") {
      continue;
    }
    out[k] = stripVolatileAstFields(v);
  }
  return out;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (typeof v === "bigint") {
      return v.toString();
    }
    return v;
  });
}

/**
 * Recursively normalize an AST subtree for structural comparison.
 * - Sorts commutative binary operands (+, *, AND, OR) by canonical string.
 * - Sorts SELECT column list by canonical expression (ignores alias differences for structure).
 * - Sorts top-level FROM entries when they are simple table refs (order-independent for cross-join style lists).
 */
function normalizeAstNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(normalizeAstNode);
  }
  if (!isPlainObject(node)) {
    return node;
  }

  const base: Record<string, unknown> = { ...node };

  if (base.type === "binary_expr" && typeof base.operator === "string") {
    const op = base.operator.toUpperCase();
    if (COMMUTATIVE_OPERATORS.has(op)) {
      const left = normalizeAstNode(base.left);
      const right = normalizeAstNode(base.right);
      const l = canonicalStringify(left);
      const r = canonicalStringify(right);
      return {
        ...base,
        left: l <= r ? left : right,
        right: l <= r ? right : left,
      };
    }
    return {
      ...base,
      left: normalizeAstNode(base.left),
      right: normalizeAstNode(base.right),
    };
  }

  if (base.type === "select") {
    const columns = Array.isArray(base.columns) ? base.columns : [];
    const normalizedCols = columns
      .map((c) => normalizeAstNode(c))
      .sort((a, b) => canonicalStringify(columnSortKey(a)).localeCompare(canonicalStringify(columnSortKey(b))));

    const rawFrom = base.from;
    const fromList: unknown[] = Array.isArray(rawFrom)
      ? rawFrom
      : rawFrom != null
        ? [rawFrom]
        : [];
    const normalizedFrom = fromList
      .map((f) => normalizeAstNode(f))
      .sort((a, b) => canonicalStringify(fromSortKey(a)).localeCompare(canonicalStringify(fromSortKey(b))));

    return {
      ...base,
      columns: normalizedCols,
      from: normalizedFrom,
      where: base.where != null ? normalizeAstNode(base.where) : base.where,
      having: base.having != null ? normalizeAstNode(base.having) : base.having,
      groupby: base.groupby != null ? normalizeAstNode(base.groupby) : base.groupby,
      orderby: base.orderby != null ? normalizeAstNode(base.orderby) : base.orderby,
      limit: base.limit != null ? normalizeAstNode(base.limit) : base.limit,
    };
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = normalizeAstNode(v);
  }
  return out;
}

/**
 * For column ordering, prefer structural expr over alias (aliases are cosmetic).
 */
function columnSortKey(col: unknown): unknown {
  if (!isPlainObject(col)) {
    return col;
  }
  if ("expr" in col && col.expr != null) {
    return col.expr;
  }
  return col;
}

/**
 * Best-effort FROM sort key: table names / subquery hashes — avoids alias churn.
 */
function fromSortKey(from: unknown): unknown {
  if (!isPlainObject(from)) {
    return from;
  }
  if (typeof from.table === "string") {
    return from.table;
  }
  if (from.expr) {
    return from.expr;
  }
  return from;
}

/**
 * Parse SQL and return a deterministic structural hash of the normalized AST.
 */
export function structuralHashFromSql(sql: string, dialect: SqlDialect = "postgresql"): SqlCompareResult {
  try {
    const { ast } = parser.parse(sql, { database: dialect });
    const cleaned = stripVolatileAstFields(ast);
    const normalized = normalizeAstNode(cleaned);
    const canonicalJson = canonicalStringify(normalized);
    const structuralHash = crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
    return { ok: true, ast: normalized, canonicalJson, structuralHash };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * True when two SQL strings are structurally identical under normalization.
 */
export function areSqlStructurallyEqual(
  a: string,
  b: string,
  dialect: SqlDialect = "postgresql",
): boolean {
  const ra = structuralHashFromSql(a, dialect);
  const rb = structuralHashFromSql(b, dialect);
  if (!ra.ok || !rb.ok) {
    return false;
  }
  return ra.structuralHash === rb.structuralHash;
}
