/**
 * Attribution required by each provider's terms, shown next to displayed
 * weather. Open-Meteo data is CC BY 4.0: "Weather data by Open-Meteo.com".
 */
export function weatherAttribution(
  provider: string | null,
): { label: string; href?: string } | null {
  switch (provider) {
    case "open-meteo":
      return { label: "Weather data by Open-Meteo.com", href: "https://open-meteo.com/" };
    case "static":
      return { label: "Test weather (static provider)" };
    default:
      return null;
  }
}
