import "server-only";
import { getPool } from "./pool";
import { put, del } from "@vercel/blob";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

type FilterOp =
  | { type: "eq"; col: string; val: unknown }
  | { type: "neq"; col: string; val: unknown }
  | { type: "gt"; col: string; val: unknown }
  | { type: "gte"; col: string; val: unknown }
  | { type: "lt"; col: string; val: unknown }
  | { type: "lte"; col: string; val: unknown }
  | { type: "in"; col: string; val: unknown[] }
  | { type: "ilike"; col: string; val: string }
  | { type: "not"; col: string; op: string; val: unknown }
  | { type: "or"; expr: string };

type OrderSpec = { col: string; ascending: boolean; nullsFirst?: boolean };

function parseOrClause(expr: string, params: unknown[]): string {
  const parts = expr.split(",");
  const sqlParts: string[] = [];
  for (const part of parts) {
    const match = part.match(/^([a-zA-Z0-9_> -]+)\.(eq|neq|ilike|gte|lte|gt|lt)\.(.*)$/);
    if (!match) continue;
    const [, rawCol, op, rawVal] = match;
    let col = rawCol.trim();
    if (col.includes("->>")) {
      const [jsonCol, prop] = col.split("->>");
      col = `${jsonCol}->>'${prop}'`;
    }
    let val: unknown = rawVal.trim();
    if (op === "ilike") {
      val = (val as string).replace(/^\*/, "%").replace(/\*$/, "%");
    }
    params.push(val);
    const pIdx = `$${params.length}`;
    const opMap: Record<string, string> = { eq: "=", neq: "<>", ilike: "ILIKE", gte: ">=", lte: "<=", gt: ">", lt: "<" };
    sqlParts.push(`${col} ${opMap[op]} ${pIdx}`);
  }
  return sqlParts.length ? `(${sqlParts.join(" OR ")})` : "";
}

function parseNotClause(col: string, op: string, val: unknown, params: unknown[]): string {
  if (op === "is" && val === null) {
    return `${col} IS NOT NULL`;
  }
  if (op === "in") {
    let list: string[] = [];
    if (typeof val === "string") {
      list = val
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
    } else if (Array.isArray(val)) {
      list = val as string[];
    }
    params.push(list);
    return `NOT (${col} = ANY($${params.length}))`;
  }
  params.push(val);
  return `${col} != $${params.length}`;
}

export class QueryBuilder<T = any> implements PromiseLike<{ data: T[] | null; error: any; count?: number | null }> {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private selectCols: string = "*";
  private countMode?: "exact";
  private filters: FilterOp[] = [];
  private orders: OrderSpec[] = [];
  private limitVal?: number;
  private offsetVal?: number;
  private insertPayload?: any;
  private updatePayload?: any;
  private upsertPayload?: any;
  private upsertOnConflict?: string;
  private singleMode?: "single" | "maybeSingle";
  private userId?: string;

  constructor(table: string, userId?: string) {
    this.table = table;
    this.userId = userId;
  }

  select(columns: string = "*", options?: { count?: "exact" }): this {
    if (this.action === "insert" || this.action === "update") {
      this.selectCols = columns;
      return this;
    }
    this.action = "select";
    this.selectCols = columns;
    this.countMode = options?.count;
    return this;
  }

  insert(values: any): this {
    this.action = "insert";
    this.insertPayload = values;
    return this;
  }

  update(values: any): this {
    this.action = "update";
    this.updatePayload = values;
    return this;
  }

  delete(options?: { count?: "exact" }): this {
    this.action = "delete";
    this.countMode = options?.count;
    return this;
  }

  upsert(values: any, options?: { onConflict?: string }): this {
    this.action = "upsert";
    this.upsertPayload = values;
    this.upsertOnConflict = options?.onConflict;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ type: "neq", col, val });
    return this;
  }

  gt(col: string, val: unknown): this {
    this.filters.push({ type: "gt", col, val });
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push({ type: "gte", col, val });
    return this;
  }

  lt(col: string, val: unknown): this {
    this.filters.push({ type: "lt", col, val });
    return this;
  }

  lte(col: string, val: unknown): this {
    this.filters.push({ type: "lte", col, val });
    return this;
  }

  in(col: string, val: unknown[]): this {
    this.filters.push({ type: "in", col, val });
    return this;
  }

  ilike(col: string, val: string): this {
    this.filters.push({ type: "ilike", col, val });
    return this;
  }

  not(col: string, op: string, val: unknown): this {
    this.filters.push({ type: "not", col, op, val });
    return this;
  }

  or(expr: string): this {
    this.filters.push({ type: "or", expr });
    return this;
  }

  order(col: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}): this {
    this.orders.push({
      col,
      ascending: options.ascending ?? true,
      nullsFirst: options.nullsFirst,
    });
    return this;
  }

  limit(n: number): this {
    this.limitVal = n;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }

  single(): PromiseLike<{ data: T; error: any }> {
    this.singleMode = "single";
    return this as any;
  }

  maybeSingle(): PromiseLike<{ data: T | null; error: any }> {
    this.singleMode = "maybeSingle";
    return this as any;
  }

  returns<NewT>(): QueryBuilder<NewT> {
    return this as unknown as QueryBuilder<NewT>;
  }

  private buildWhereClause(params: unknown[]): string {
    const clauses: string[] = [];

    // Automatically scope by user_id if table has user_id and this.userId is set
    // AND query does not already have a user_id filter
    const userScopedTables = [
      "profiles",
      "clients",
      "items",
      "invoices",
      "invoice_items",
      "payments",
      "invoice_counters",
      "gmail_connections",
    ];
    if (this.userId && userScopedTables.includes(this.table)) {
      const hasUserFilter = this.filters.some(
        (f) => f.type === "eq" && f.col === "user_id"
      );
      if (!hasUserFilter) {
        params.push(this.userId);
        clauses.push(`user_id = $${params.length}`);
      }
    }

    for (const f of this.filters) {
      if (f.type === "eq") {
        if (f.val === null) {
          clauses.push(`${f.col} IS NULL`);
        } else {
          params.push(f.val);
          clauses.push(`${f.col} = $${params.length}`);
        }
      } else if (f.type === "neq") {
        if (f.val === null) {
          clauses.push(`${f.col} IS NOT NULL`);
        } else {
          params.push(f.val);
          clauses.push(`${f.col} <> $${params.length}`);
        }
      } else if (f.type === "gt") {
        params.push(f.val);
        clauses.push(`${f.col} > $${params.length}`);
      } else if (f.type === "gte") {
        params.push(f.val);
        clauses.push(`${f.col} >= $${params.length}`);
      } else if (f.type === "lt") {
        params.push(f.val);
        clauses.push(`${f.col} < $${params.length}`);
      } else if (f.type === "lte") {
        params.push(f.val);
        clauses.push(`${f.col} <= $${params.length}`);
      } else if (f.type === "in") {
        params.push(f.val);
        clauses.push(`${f.col} = ANY($${params.length})`);
      } else if (f.type === "ilike") {
        params.push(f.val);
        clauses.push(`${f.col} ILIKE $${params.length}`);
      } else if (f.type === "not") {
        clauses.push(parseNotClause(f.col, f.op, f.val, params));
      } else if (f.type === "or") {
        const orSql = parseOrClause(f.expr, params);
        if (orSql) clauses.push(orSql);
      }
    }

    return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  }

  async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    const pool = getPool();

    try {
      if (this.action === "select") {
        const params: unknown[] = [];
        const where = this.buildWhereClause(params);

        let count: number | null = null;
        if (this.countMode === "exact") {
          const countSql = `SELECT count(*)::int as count FROM ${this.table} ${where}`;
          const countRes = await pool.query(countSql, params);
          count = countRes.rows[0]?.count ?? 0;
        }

        let orderSql = "";
        if (this.orders.length) {
          orderSql =
            "ORDER BY " +
            this.orders
              .map((o) => {
                let s = `${o.col} ${o.ascending ? "ASC" : "DESC"}`;
                if (o.nullsFirst !== undefined) {
                  s += o.nullsFirst ? " NULLS FIRST" : " NULLS LAST";
                }
                return s;
              })
              .join(", ");
        }

        let limitSql = "";
        if (this.limitVal !== undefined) {
          params.push(this.limitVal);
          limitSql += ` LIMIT $${params.length}`;
        }
        if (this.offsetVal !== undefined) {
          params.push(this.offsetVal);
          limitSql += ` OFFSET $${params.length}`;
        }

        const cols = this.selectCols.trim();
        const sql = `SELECT ${cols} FROM ${this.table} ${where} ${orderSql} ${limitSql}`.trim();
        const res = await pool.query(sql, params);

        if (this.singleMode === "single") {
          if (res.rows.length === 0) {
            return {
              data: null,
              error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
              count: 0,
            };
          }
          return { data: res.rows[0], error: null, count: 1 };
        }

        if (this.singleMode === "maybeSingle") {
          return { data: res.rows[0] ?? null, error: null, count: res.rows.length };
        }

        return { data: res.rows, error: null, count };
      }

      if (this.action === "insert") {
        const rows = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
        if (rows.length === 0) return { data: [], error: null, count: 0 };

        // Attach userId if row has no user_id and table is user scoped.
        // `payments` is included so a missing user_id never hits the NOT NULL constraint
        // (callers also pass it explicitly, but this is a last line of defense).
        const userScopedTables = ["clients", "items", "invoices", "invoice_items", "payments", "profiles"];
        if (this.userId && userScopedTables.includes(this.table)) {
          for (const r of rows) {
            if (r.user_id === undefined) r.user_id = this.userId;
          }
        }

        const keys = Object.keys(rows[0]);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const params: unknown[] = [];
        const valuePlaceholders: string[] = [];

        for (const row of rows) {
          const ph: string[] = [];
          for (const k of keys) {
            const v = row[k];
            params.push(typeof v === "object" && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
            ph.push(`$${params.length}`);
          }
          valuePlaceholders.push(`(${ph.join(", ")})`);
        }

        const retCols = this.selectCols === "*" ? "*" : this.selectCols;
        const sql = `INSERT INTO ${this.table} (${cols}) VALUES ${valuePlaceholders.join(", ")} RETURNING ${retCols}`;
        const res = await pool.query(sql, params);

        if (this.singleMode === "single" || !Array.isArray(this.insertPayload)) {
          return { data: res.rows[0], error: null, count: res.rows.length };
        }
        return { data: res.rows, error: null, count: res.rows.length };
      }

      if (this.action === "update") {
        const keys = Object.keys(this.updatePayload);
        if (keys.length === 0) return { data: null, error: null };

        const params: unknown[] = [];
        const setClauses: string[] = [];
        for (const k of keys) {
          const v = this.updatePayload[k];
          params.push(typeof v === "object" && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
          setClauses.push(`"${k}" = $${params.length}`);
        }

        const where = this.buildWhereClause(params);
        const retCols = this.selectCols === "*" ? "*" : this.selectCols;
        const sql = `UPDATE ${this.table} SET ${setClauses.join(", ")} ${where} RETURNING ${retCols}`;
        const res = await pool.query(sql, params);

        if (this.singleMode === "single") {
          return { data: res.rows[0] ?? null, error: null, count: res.rows.length };
        }
        return { data: res.rows, error: null, count: res.rows.length };
      }

      if (this.action === "delete") {
        const params: unknown[] = [];
        const where = this.buildWhereClause(params);
        const sql = `DELETE FROM ${this.table} ${where} RETURNING 1`;
        const res = await pool.query(sql, params);
        return { data: null, error: null, count: res.rowCount ?? 0 };
      }

      if (this.action === "upsert") {
        const row = this.upsertPayload;
        if (this.userId && ["profiles", "gmail_connections"].includes(this.table)) {
          if (row.user_id === undefined) row.user_id = this.userId;
        }

        const keys = Object.keys(row);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const params: unknown[] = [];
        const ph: string[] = [];

        for (const k of keys) {
          const v = row[k];
          params.push(typeof v === "object" && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
          ph.push(`$${params.length}`);
        }

        const conflictCol = this.upsertOnConflict || "user_id";
        const updateClauses = keys
          .filter((k) => k !== conflictCol)
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(", ");

        const sql = `
          INSERT INTO ${this.table} (${cols}) 
          VALUES (${ph.join(", ")}) 
          ON CONFLICT ("${conflictCol}") 
          DO UPDATE SET ${updateClauses || `${conflictCol} = EXCLUDED.${conflictCol}`}
          RETURNING *
        `;
        const res = await pool.query(sql, params);
        return { data: res.rows[0], error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: { message: err.message, code: err.code || "DB_ERROR" },
        count: null,
      };
    }
  }

  then<TResult1 = { data: T[] | null; error: any; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
  }
}

export function createDbClient(userId?: string) {
  return {
    from: <TableName extends string = any>(table: TableName) =>
      new QueryBuilder<TableName extends keyof Tables ? Tables[TableName]["Row"] : any>(table, userId),
    rpc: async (fnName: string, args: Record<string, any> = {}) => {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (userId) {
          await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
        }

        if (fnName === "next_invoice_number") {
          const res = await client.query("SELECT next_invoice_number($1) as res", [args.p_fy]);
          await client.query("COMMIT");
          return { data: res.rows[0]?.res as number, error: null };
        }

        if (fnName === "save_invoice") {
          const res = await client.query("SELECT save_invoice($1::jsonb, $2::jsonb) as id", [
            JSON.stringify(args.p_invoice),
            JSON.stringify(args.p_items),
          ]);
          await client.query("COMMIT");
          return { data: res.rows[0]?.id as string, error: null };
        }

        if (fnName === "record_items") {
          await client.query("SELECT record_items($1::jsonb)", [JSON.stringify(args.p_items)]);
          await client.query("COMMIT");
          return { data: null, error: null };
        }

        await client.query("COMMIT");
        return { data: null, error: null };
      } catch (err: any) {
        await client.query("ROLLBACK");
        return { data: null, error: { message: err.message, code: err.code } };
      } finally {
        client.release();
      }
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, fileOrBytes: any, opts?: { upsert?: boolean; contentType?: string }) => {
          try {
            const blob = await put(`${bucket}/${path}`, fileOrBytes, {
              access: "public",
              contentType: opts?.contentType,
              addRandomSuffix: false,
            });
            return { data: { path: blob.url, url: blob.url }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },
        createSignedUrl: async (path: string, expiresIn?: number) => {
          if (path.startsWith("http")) {
            return { data: { signedUrl: path }, error: null };
          }
          try {
            const { list } = await import("@vercel/blob");
            const found = await list({ prefix: `${bucket}/${path}` });
            if (found.blobs.length > 0) {
              return { data: { signedUrl: found.blobs[0].url }, error: null };
            }
          } catch {}
          return { data: { signedUrl: path }, error: null };
        },
        download: async (path: string) => {
          try {
            let url = path;
            if (!url.startsWith("http")) {
              const { list } = await import("@vercel/blob");
              const found = await list({ prefix: `${bucket}/${path}` });
              if (found.blobs.length > 0) {
                url = found.blobs[0].url;
              } else {
                throw new Error("Blob not found");
              }
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            return { data: blob, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },
        remove: async (paths: string[]) => {
          try {
            const { del, list } = await import("@vercel/blob");
            for (const p of paths) {
              if (p.startsWith("http")) {
                await del(p);
              } else {
                const found = await list({ prefix: `${bucket}/${p}` });
                for (const b of found.blobs) {
                  await del(b.url);
                }
              }
            }
            return { data: null, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },
      }),
    },
  };
}

export type DbClient = ReturnType<typeof createDbClient>;
