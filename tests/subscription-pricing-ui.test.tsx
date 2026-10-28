import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnualPriceDisplay } from "../src/features/subscription/AnnualPrice";
import { annualPriceForUser } from "../src/features/subscription/pricing";

describe("annual pricing presentation", () => {
  it("shows only 400 to an Egyptian account, never the other price or the rule", () => {
    const price = annualPriceForUser({ phone: "201012345678", phone_confirmed_at: "2026-10-13" }, false);
    const html = renderToStaticMarkup(<AnnualPriceDisplay price={price} />);
    expect(html).toContain("400");
    expect(html).toContain("جنيه مصري / سنة");
    expect(html).not.toContain("1200");
    expect(html).not.toContain("<del");
    expect(html).not.toContain("الهاتف المصري");
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
