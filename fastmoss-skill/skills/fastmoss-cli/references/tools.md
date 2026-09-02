# FastMoss CLI Tool Catalog

> Generated from the static FastMoss tool list. Use the category files below as the tool catalog for `fastmoss call`.

## How to call tools

```bash
fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

Before every `fastmoss call`, run `fastmoss tools --search <tool_name>` when live metadata is available. It is the authority for required fields, nesting, and enum values; the static catalog files below are the packaged fallback and release-time reference.

## Categories

| Category | File | Tools | Use for |
|---|---|---:|---|
| Advertising Tools | [Advertising Tools](tools-advertising.md) | 2 | Advertising tools for ad creatives, ad spend, ROAS, engagement, and paid-traffic performance analysis. |
| Agency Tools | [Agency Tools](tools-agency.md) | 7 | Agency tools for MCN agency search, rankings, profiles, creator collaborations, promoted products, and collaborating-shop analysis. |
| Creator Tools | [Creator Tools](tools-creator.md) | 10 | Creator tools for creator search, profile checks, ecommerce performance, audience fit, trends, videos, and partnership evaluation. |
| Product Tools | [Product Tools](tools-product.md) | 12 | Product tools for product search, details, sales trends, creator mix, videos, SKUs, reviews, and ad investment analysis. |
| Shop Tools | [Shop Tools](tools-shop.md) | 10 | Shop tools for shop search, profile checks, sales, products, creators, livestreams, short videos, and ad investment analysis. |
| Market Insight Tools | [Market Insight Tools](tools-market.md) | 3 | Market insight tools for category size, growth, competition, rankings, opportunities, and creator sales matrix analysis. |
| Live Tools | [Live Tools](tools-live.md) | 3 | Live-session tools for live search, performance analysis, and product lists. |
| Video Tools | [Video Tools](tools-video.md) | 4 | Video tools for video search, performance analysis, trends, and subtitles. |
| Auxiliary and Knowledge Base Tools | [Auxiliary and Knowledge Base Tools](tools-auxiliary-knowledge.md) | 4 | Auxiliary and knowledge base tools for category keyword matching, FastMoss documentation, detail-page URL rules, quota checks, and tools outside the main business prefixes. |

Read only the category file that matches the user's task before calling a tool.
