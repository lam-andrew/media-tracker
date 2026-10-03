import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { User } from "../../../packages/contracts/src/index.js";

const nameSchema = z.string().trim().min(1).max(80);
const bodySchema = z.object({ name: nameSchema });
const idSchema = z.object({ id: z.uuid() });
const membershipSchema = idSchema.extend({ itemId: z.uuid() });
const missing = () =>
  Object.assign(new Error("Collection or library item not found."), {
    statusCode: 404,
  });

export type Collection = { id: string; name: string; itemIds: string[] };
const portableSchema = z
  .array(
    z.object({
      name: nameSchema,
      items: z
        .array(
          z.object({
            type: z.string().min(1),
            source: z.string().min(1),
            externalId: z.string().min(1),
          }),
        )
        .max(10000),
    }),
  )
  .max(100);
export type PortableCollection = z.infer<typeof portableSchema>[number];

/** Export stable media identities, never database IDs, scoped to the owner. */
export async function exportCollections(
  db: Pool | PoolClient,
  userId: string,
): Promise<PortableCollection[]> {
  return (
    await db.query(
      `select c.name, coalesce(jsonb_agg(jsonb_build_object(
         'type',l.media_type,'source',l.source,'externalId',l.external_id
       ) order by l.media_type,l.source,l.external_id) filter(where l.id is not null),'[]'::jsonb) as items
       from collections c
       left join collection_memberships m on m.collection_id=c.id and m.user_id=c.user_id
       left join library l on l.id=m.item_id and l.user_id=m.user_id
       where c.user_id=$1 group by c.id order by c.created_at,c.id`,
      [userId],
    )
  ).rows;
}

/**
 * Call inside the parent's import transaction, after importing library entries.
 * Merges by trimmed name and media identity, resolves only this owner's library
 * entries, and skips missing entries. Returns the number of processed collections.
 */
export async function importCollections(
  client: PoolClient,
  userId: string,
  data: unknown,
): Promise<number> {
  const entries = portableSchema.parse(data);
  for (const entry of entries) {
    const result = await client.query(
      `insert into collections(id,user_id,name) values($1,$2,$3)
       on conflict(user_id,name) do update set name=excluded.name returning id`,
      [randomUUID(), userId, entry.name],
    );
    const id = result.rows[0].id;
    for (const item of entry.items)
      await client.query(
        `insert into collection_memberships(user_id,collection_id,item_id)
         select user_id,$2,id from library
         where user_id=$1 and media_type=$3 and source=$4 and external_id=$5
         on conflict do nothing`,
        [userId, id, item.type, item.source, item.externalId],
      );
  }
  return entries.length;
}

async function withCollection<T>(
  pool: Pool,
  userId: string,
  id: string,
  action: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Serialize mutations with collection deletion/renaming and other membership writes.
    const owned = await client.query(
      "select id from collections where user_id=$1 and id=$2 for update",
      [userId, id],
    );
    if (!owned.rowCount) throw missing();
    const result = await action(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function collections(
  app: FastifyInstance,
  pool: Pool,
  user: (req: FastifyRequest) => Promise<User>,
) {
  app.get("/api/collections", async (req): Promise<Collection[]> => {
    const owner = await user(req);
    return (
      await pool.query(
        `select c.id,c.name,coalesce(jsonb_agg(m.item_id order by m.item_id)
         filter(where m.item_id is not null),'[]'::jsonb) as "itemIds"
         from collections c left join collection_memberships m
         on m.collection_id=c.id and m.user_id=c.user_id
         where c.user_id=$1 group by c.id order by c.created_at,c.id`,
        [owner.id],
      )
    ).rows;
  });
  app.post("/api/collections", async (req): Promise<Collection> => {
    const owner = await user(req);
    const { name } = bodySchema.parse(req.body);
    const id = randomUUID();
    const result = await pool.query(
      `insert into collections(id,user_id,name) values($1,$2,$3)
       on conflict(user_id,name) do nothing returning id`,
      [id, owner.id, name],
    );
    if (!result.rowCount)
      throw Object.assign(
        new Error("A collection with this name already exists."),
        { statusCode: 409 },
      );
    return { id, name, itemIds: [] };
  });
  app.patch("/api/collections/:id", async (req) => {
    const owner = await user(req);
    const { id } = idSchema.parse(req.params);
    const { name } = bodySchema.parse(req.body);
    const result = await pool
      .query(
        "update collections set name=$3 where user_id=$1 and id=$2 returning id",
        [owner.id, id, name],
      )
      .catch((error: unknown) => {
        if ((error as { code?: string }).code === "23505")
          throw Object.assign(
            new Error("A collection with this name already exists."),
            { statusCode: 409 },
          );
        throw error;
      });
    if (!result.rowCount) throw missing();
    return { ok: true };
  });
  app.delete("/api/collections/:id", async (req) => {
    const owner = await user(req);
    const { id } = idSchema.parse(req.params);
    const result = await pool.query(
      "delete from collections where user_id=$1 and id=$2 returning id",
      [owner.id, id],
    );
    if (!result.rowCount) throw missing();
    return { ok: true };
  });
  for (const method of ["PUT", "DELETE"] as const)
    app.route({
      method,
      url: "/api/collections/:id/items/:itemId",
      handler: async (req) => {
        const owner = await user(req);
        const { id, itemId } = membershipSchema.parse(req.params);
        return withCollection(pool, owner.id, id, async (client) => {
          // Keep the library row alive until commit, including during an add/delete race.
          const item = await client.query(
            "select id from library where user_id=$1 and id=$2 for key share",
            [owner.id, itemId],
          );
          if (!item.rowCount) throw missing();
          if (method === "PUT")
            await client.query(
              `insert into collection_memberships(user_id,collection_id,item_id)
               values($1,$2,$3) on conflict do nothing`,
              [owner.id, id, itemId],
            );
          else
            await client.query(
              "delete from collection_memberships where user_id=$1 and collection_id=$2 and item_id=$3",
              [owner.id, id, itemId],
            );
          return { ok: true };
        });
      },
    });
}
