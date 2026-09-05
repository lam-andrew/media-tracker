import { describe, it, expect } from "vitest";
import { decodeJwtPayload, isJwtExpired } from "./jwt";

function b64url(s: string): string {
  return Buffer.from(s)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify(payload))}.sig`;
}

describe("decodeJwtPayload", () => {
  it("reads claims from a well-formed token", () => {
    const claims = decodeJwtPayload(
      fakeJwt({ sub: "user-1", email: "a@b.co", exp: 4102444800 }),
    );
    expect(claims).toMatchObject({ sub: "user-1", email: "a@b.co" });
  });

  it("handles base64url payloads that need padding", () => {
    // "sub":"x" encodes to a length that is not a multiple of 4 once unpadded.
    expect(decodeJwtPayload(fakeJwt({ sub: "x" }))).toEqual({ sub: "x" });
  });

  it("returns null for garbage", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("a.!!!.c")).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
  });
});

describe("isJwtExpired", () => {
  it("is true for a past exp and false for a future one", () => {
    expect(isJwtExpired({ exp: Math.floor(Date.now() / 1000) - 60 })).toBe(
      true,
    );
    expect(isJwtExpired({ exp: Math.floor(Date.now() / 1000) + 3600 })).toBe(
      false,
    );
  });

  it("treats a missing exp (or null claims) as not expired", () => {
    expect(isJwtExpired({})).toBe(false);
    expect(isJwtExpired(null)).toBe(false);
  });
});
