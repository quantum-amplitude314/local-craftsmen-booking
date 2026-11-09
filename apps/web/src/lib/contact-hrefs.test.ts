import { describe, expect, test } from "bun:test";
import { contactHrefsFor } from "./contact-hrefs";

describe("contact hrefs", () => {
  test("opens on the current page and closes back to it", () => {
    const hrefs = contactHrefsFor({ rest: ["craftsmen", "42"], query: {} });

    expect(hrefs).toEqual({
      isOpen: false,
      open: { pathname: "/craftsmen/42", query: { contact: "" } },
      close: { pathname: "/craftsmen/42", query: {} },
    });
  });

  test("keeps the page's own query both ways", () => {
    const hrefs = contactHrefsFor({
      query: { city: "prague", craft: ["painting", "plumbing"], contact: "" },
    });

    expect(hrefs.isOpen).toBe(true);
    expect(hrefs.open).toEqual({
      pathname: "/",
      query: { city: "prague", craft: ["painting", "plumbing"], contact: "" },
    });
    expect(hrefs.close).toEqual({
      pathname: "/",
      query: { city: "prague", craft: ["painting", "plumbing"] },
    });
  });

  test("drops absent values instead of writing empty parameters", () => {
    const hrefs = contactHrefsFor({ query: { city: undefined } });

    expect(hrefs.close.query).toEqual({});
  });
});
