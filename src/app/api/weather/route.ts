import { NextResponse } from "next/server";
import { currentUser } from "@/modules/auth/session";
import { CoordsInput } from "@/modules/weather";
import { getWeatherService } from "@/modules/weather/service";
import { takeToken } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";

export const runtime = "nodejs"; // uses Prisma-backed session via auth()

/**
 * GET /api/weather?lat=..&lon=..
 *
 * Current weather for a preview (the log form). Requires a
 * session — we do not proxy the provider anonymously. Coordinates are rounded
 * by the service before leaving the server. Rate limited to 60/min per
 * (user, ip).
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

  const weather = await getWeatherService().snapshot(parsed.data, new Date());
  if (!weather) {
    return NextResponse.json({ error: "weather unavailable" }, { status: 502 });
  }
  return NextResponse.json({
    temperatureC: weather.temperatureC,
    humidityPct: weather.humidityPct,
    condition: weather.condition,
    provider: weather.provider,
  });
}
