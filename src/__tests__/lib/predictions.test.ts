import { describe, it, expect } from "vitest";
import { canPredict } from "@/lib/predictions";

describe("canPredict", () => {
  it("returns true for UPCOMING match", () => {
    expect(canPredict({ status: "UPCOMING" })).toBe(true);
  });

  it("returns false for LOCKED match", () => {
    expect(canPredict({ status: "LOCKED" })).toBe(false);
  });

  it("returns false for FINISHED match", () => {
    expect(canPredict({ status: "FINISHED" })).toBe(false);
  });

  it("returns false when globalLock is true even for UPCOMING match", () => {
    expect(canPredict({ status: "UPCOMING" }, true)).toBe(false);
  });

  it("returns true when globalLock is false for UPCOMING match", () => {
    expect(canPredict({ status: "UPCOMING" }, false)).toBe(true);
  });

  it("version must be 1, 2, or 3", () => {
    expect(canPredict({ status: "UPCOMING" }, false, 1)).toBe(true);
    expect(canPredict({ status: "UPCOMING" }, false, 4)).toBe(false);
    expect(canPredict({ status: "UPCOMING" }, false, 0)).toBe(false);
  });
});
