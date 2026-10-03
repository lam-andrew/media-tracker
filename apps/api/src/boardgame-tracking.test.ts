import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trackingSchema,
  mediaSchema,
  mediaConfig,
} from "../../../packages/contracts/src/index.js";
const legacy = {
  status: "backlog",
  rating: null,
  favorite: false,
  current: 0,
  total: null,
  notes: "",
};
test("tracking accepts legacy records and keeps independent board-game ownership and plays", () => {
  assert.equal(trackingSchema.parse(legacy).playCount, undefined);
  const t = trackingSchema.parse({
    ...legacy,
    owned: true,
    playCount: 7,
    lastPlayedAt: "2026-10-02",
  });
  assert.equal(t.status, "backlog");
  assert.equal(t.owned, true);
  assert.equal(t.playCount, 7);
  assert.equal(t.lastPlayedAt, "2026-10-02");
  assert.equal(
    trackingSchema.safeParse({ ...t, playCount: -1 }).success,
    false,
  );
  assert.equal(
    trackingSchema.safeParse({ ...t, playCount: 0.5 }).success,
    false,
  );
  assert.equal(
    trackingSchema.safeParse({ ...t, lastPlayedAt: "not-a-date" }).success,
    false,
  );
});
test("board games are a distinct importable media type without completion percentage", () => {
  const media = mediaSchema.parse({
    type: "boardgame",
    source: "bgg",
    externalId: "13",
    title: "Catan",
    creators: [],
    image: null,
    description: "",
    metadata: {},
  });
  assert.equal(media.type, "boardgame");
  assert.equal(mediaConfig.boardgame.unit, "");
  assert.equal(mediaConfig.game.label, "Video games");
});
