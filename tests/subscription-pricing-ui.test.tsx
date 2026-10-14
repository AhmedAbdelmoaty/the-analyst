import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnualPriceDisplay } from "../src/features/subscription/AnnualPrice";
import { annualPriceForUser } from "../src/features/subscription/pricing";

describe("annual pricing presentation", () => {
  it("shows 400 prominently and the 1200 base as a crossed-out reference", () => {
    const price = annualPriceForUser({ phone: "201012345678", phone_confirmed_at: "2026-10-13" }, false);
    const html = renderToStaticMarkup(<AnnualPriceDisplay price={price} />);
    expect(html).toContain("400");
    expect(html).toContain("جنيه مصري / سنة");
    expect(html).toContain("السعر الأساسي");
    expect(html).toContain("<del");
    expect(html).toContain("1200");
  });

  it("shows only 1200 for a guest and no stale discounted value while loading", () => {
    const guest = renderToStaticMarkup(<AnnualPriceDisplay price={annualPriceForUser(null, false)} />);
    expect(guest).toContain("1200");
    expect(guest).not.toContain("<del");
    const loading = renderToStaticMarkup(<AnnualPriceDisplay price={null} />);
    expect(loading).toContain("جاري عرض السعر");
    expect(loading).not.toContain("400");
    expect(loading).not.toContain("1200");
  });
});
