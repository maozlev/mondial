import { describe, it, expect, beforeEach } from "vitest";
import { isAdmin } from "@/lib/admin";

describe("isAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns true when email matches ADMIN_EMAIL exactly", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdmin("admin@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    process.env.ADMIN_EMAIL = "Admin@Example.com";
    expect(isAdmin("admin@example.com")).toBe(true);
    expect(isAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
  });

  it("returns false for a non-admin email", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdmin("user@example.com")).toBe(false);
  });

  it("returns false when email is null", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdmin(null)).toBe(false);
  });

  it("returns false when email is undefined", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdmin(undefined)).toBe(false);
  });

  it("returns false when ADMIN_EMAIL is not set", () => {
    delete process.env.ADMIN_EMAIL;
    expect(isAdmin("admin@example.com")).toBe(false);
  });

  it("returns false when ADMIN_EMAIL is empty string", () => {
    process.env.ADMIN_EMAIL = "";
    expect(isAdmin("admin@example.com")).toBe(false);
  });
});
