import { test, expect } from "vitest";
import { viewerMessageSchema } from "@xr/types";
const id = "11111111-1111-4111-8111-111111111111";
test("viewer accepts the versioned camera command", () => {
  expect(
    viewerMessageSchema.parse({
      version: 1,
      id,
      command: { type: "SET_CAMERA", payload: { preset: "interior" } },
    }).command.type,
  ).toBe("SET_CAMERA");
});
test("viewer rejects unknown versions and command names", () => {
  expect(
    viewerMessageSchema.safeParse({
      version: 2,
      id,
      command: { type: "SET_CAMERA", payload: { preset: "interior" } },
    }).success,
  ).toBe(false);
  expect(
    viewerMessageSchema.safeParse({
      version: 1,
      id,
      command: { type: "EXECUTE", payload: {} },
    }).success,
  ).toBe(false);
});
test("viewer rejects malformed camera payloads and commercial envelope data", () => {
  expect(
    viewerMessageSchema.safeParse({
      version: 1,
      id,
      command: { type: "SET_CAMERA", payload: { preset: "invalid" } },
    }).success,
  ).toBe(false);
  expect(
    viewerMessageSchema.safeParse({
      version: 1,
      id,
      command: { type: "RESET_CONFIGURATION", payload: {} },
      price: 1,
    }).success,
  ).toBe(false);
});
