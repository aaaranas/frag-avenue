import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { CoordsInput, fetchCurrentWeather } from "@/modules/weather";
import { takeToken } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";

export const runtime = "nodejs"; // uses Prisma-backed session via auth()

/**
 * GET /api/weather?lat=..&lon=..
 *
 * Requires a session — we do not proxy Open-Meteo anonymously. Returns
 * { temperatureC, humidityPct, condition } on success or { error } on failure.
 * Rate limited to 60 requests / minute per (user, ip).
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = await requestIp();
  const rl = takeToken(`weather:${user.id}:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    logger.warn("weather.rate_limited", { userId: user.id, ip });
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const url = new URL(req.url);
  const parsed = CoordsInput.safeParse({
    lat: url.searchParams.get("lat"),
    lon: url.searchParams.get("lon"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const weather = await fetchCurrentWeather(parsed.data.lat, parsed.data.lon);
  if (!weather) {
    return NextResponse.json({ error: "weather unavailable" }, { status: 502 });
  }
  return NextResponse.json(weather);
}
