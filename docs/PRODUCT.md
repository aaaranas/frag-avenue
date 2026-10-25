# Frag Avenue — Product

## Positioning

Frag Avenue is a wear-log platform for fragrance enthusiasts ("fragheads"), in the spirit of Strava: you log what you wear, check in on how it performs over the day, and share it with the people who follow you. Your wardrobe, your stats, and your feed all come from the same longitudinal wear data.

The refactor from the earlier personal-analytics app is planned and tracked in `docs/refactor-plan.md`.

## Core loop

Collect → Wear → Check in → Share → Learn.

The most frequent action is **logging today's wear**, so it is the centre tab and must stay fast on a phone.

## MVP scope

Five tabs: **Feed**, **Wardrobe**, **Log** (centre "+"), **Stats**, **Clubs**.

1. **Wardrobe** — bottles, decants, samples, and wishlist entries, each with price and fill level. Wear count and cost per wear (price ÷ wears) per item. Filter by type.
2. **Log a wear** — pick an owned item; sprays (1–10), occasion, mood, optional note; visibility. A weather snapshot (temperature, humidity) is attached automatically through a `WeatherService`.
3. **Performance check-ins** — prompts at 2h, 4h, 8h after a wear: Strong / Faint / Gone. "Gone" stops further prompts. In-app prompts in the MVP; Web Push reminders are a stretch goal.
4. **Feed** — your wears and those of people you follow (open follows), with scent, sprays, occasion, temperature, check-in summary, kudos, and comment count. A "Pick for today" card suggests the least recently worn owned item.
5. **Stats** — total wears, unique scents, day streak, most worn, accord breakdown, items untouched for 30+ days; a placeholder for performance vs. weather.
6. **Clubs and challenges** — join or leave clubs; "30 different scents in 30 days" and "5 different houses in 30 days" with live progress.

Derived-stat definitions are in `.claude/skills/frag-domain/SKILL.md`.

## Privacy

- Each wear has a visibility: public, followers, or private. New wears default to followers.
- Everything logged before the social features existed is private and stays private unless the user changes it.
- No precise location is stored; weather is fetched for rounded coordinates and only the readings are kept.

## Out of scope for the MVP

Marketplace or decant swaps, layering logs, "Scent Wrapped", weather-ranked recommendations, wear photos (deferred until after the MVP), native apps, AI chat over your data, scraping third-party fragrance sites.

## Non-goals of the design

- No fake precision. If the data does not support a number, the UI does not show one.
- No LLM narration of ordinary statistics.
- Mobile-first (390px), greyscale wireframe look with a single accent colour; real buttons and links, 44px touch targets, WCAG AA contrast.
