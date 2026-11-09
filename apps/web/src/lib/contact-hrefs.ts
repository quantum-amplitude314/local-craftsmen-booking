export type PageQuery = Record<string, string | string[] | undefined>;

export type ContactHref = { pathname: string; query: Record<string, string | string[]> };

export type ContactHrefs = { isOpen: boolean; open: ContactHref; close: ContactHref };

export const contactHrefsFor = ({ rest = [], query }: { rest?: string[]; query: PageQuery }) => {
  const pathname = `/${rest.join("/")}`;
  const { contact, ...ownQuery } = query;
  const pageQuery = Object.fromEntries(
    Object.entries(ownQuery).filter(
      (entry): entry is [string, string | string[]] => entry[1] !== undefined,
    ),
  );
  const hrefs: ContactHrefs = {
    isOpen: contact !== undefined,
    open: { pathname, query: { ...pageQuery, contact: "" } },
    close: { pathname, query: pageQuery },
  };

  return hrefs;
};
