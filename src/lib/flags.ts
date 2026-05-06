export const COUNTRY_CODES: Record<string, string> = {
  // Group A
  Mexico: "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  // Group B
  Canada: "ca",
  "Bosnia and Herzegovina": "ba",
  Qatar: "qa",
  Switzerland: "ch",
  // Group C
  Brazil: "br",
  Morocco: "ma",
  Haiti: "ht",
  Scotland: "gb-sct",
  // Group D
  "United States": "us",
  Paraguay: "py",
  Australia: "au",
  Turkey: "tr",
  // Group E
  Germany: "de",
  "Curaçao": "cw",
  "Ivory Coast": "ci",
  Ecuador: "ec",
  // Group F
  Netherlands: "nl",
  Japan: "jp",
  Sweden: "se",
  Tunisia: "tn",
  // Group G
  Belgium: "be",
  Egypt: "eg",
  Iran: "ir",
  "New Zealand": "nz",
  // Group H
  Spain: "es",
  "Cape Verde": "cv",
  "Saudi Arabia": "sa",
  Uruguay: "uy",
  // Group I
  France: "fr",
  Senegal: "sn",
  Iraq: "iq",
  Norway: "no",
  // Group J
  Argentina: "ar",
  Algeria: "dz",
  Austria: "at",
  Jordan: "jo",
  // Group K
  Portugal: "pt",
  "DR Congo": "cd",
  Uzbekistan: "uz",
  Colombia: "co",
  // Group L
  England: "gb-eng",
  Croatia: "hr",
  Ghana: "gh",
  Panama: "pa",
};

export function getCountryCode(teamName: string): string {
  return COUNTRY_CODES[teamName] ?? "";
}

export function getFlagUrl(teamName: string): string {
  const code = getCountryCode(teamName);
  if (!code) return "";
  return `https://flagcdn.com/w40/${code}.png`;
}
