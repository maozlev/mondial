import { describe, it, expect } from "vitest";
import { getCountryCode, getFlagUrl } from "@/lib/flags";

describe("getCountryCode", () => {
  it("returns correct code for host nations", () => {
    expect(getCountryCode("Mexico")).toBe("mx");
    expect(getCountryCode("Canada")).toBe("ca");
    expect(getCountryCode("United States")).toBe("us");
  });

  it("returns sub-national codes for British teams", () => {
    expect(getCountryCode("England")).toBe("gb-eng");
    expect(getCountryCode("Scotland")).toBe("gb-sct");
  });

  it("returns correct codes for all 48 teams", () => {
    const cases: [string, string][] = [
      ["South Africa", "za"],
      ["South Korea", "kr"],
      ["Czech Republic", "cz"],
      ["Bosnia and Herzegovina", "ba"],
      ["Qatar", "qa"],
      ["Switzerland", "ch"],
      ["Brazil", "br"],
      ["Morocco", "ma"],
      ["Haiti", "ht"],
      ["Paraguay", "py"],
      ["Australia", "au"],
      ["Turkey", "tr"],
      ["Germany", "de"],
      ["Curaçao", "cw"],
      ["Ivory Coast", "ci"],
      ["Ecuador", "ec"],
      ["Netherlands", "nl"],
      ["Japan", "jp"],
      ["Sweden", "se"],
      ["Tunisia", "tn"],
      ["Belgium", "be"],
      ["Egypt", "eg"],
      ["Iran", "ir"],
      ["New Zealand", "nz"],
      ["Spain", "es"],
      ["Cape Verde", "cv"],
      ["Saudi Arabia", "sa"],
      ["Uruguay", "uy"],
      ["France", "fr"],
      ["Senegal", "sn"],
      ["Iraq", "iq"],
      ["Norway", "no"],
      ["Argentina", "ar"],
      ["Algeria", "dz"],
      ["Austria", "at"],
      ["Jordan", "jo"],
      ["Portugal", "pt"],
      ["DR Congo", "cd"],
      ["Uzbekistan", "uz"],
      ["Colombia", "co"],
      ["Croatia", "hr"],
      ["Ghana", "gh"],
      ["Panama", "pa"],
    ];
    for (const [name, code] of cases) {
      expect(getCountryCode(name), `${name}`).toBe(code);
    }
  });

  it("returns empty string for unknown teams", () => {
    expect(getCountryCode("Unknown FC")).toBe("");
    expect(getCountryCode("")).toBe("");
  });
});

describe("getFlagUrl", () => {
  it("returns flagcdn URL for known teams", () => {
    expect(getFlagUrl("Brazil")).toBe("https://flagcdn.com/w40/br.png");
    expect(getFlagUrl("England")).toBe("https://flagcdn.com/w40/gb-eng.png");
  });

  it("returns empty string for unknown teams", () => {
    expect(getFlagUrl("Unknown")).toBe("");
  });
});
