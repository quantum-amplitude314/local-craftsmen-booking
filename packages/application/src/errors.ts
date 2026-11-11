import type { BookingOffer } from "@local-craftsmen/contracts";

export class DomainError extends Error {
  readonly code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT";

  constructor({ code, message }: { code: DomainError["code"]; message: string }) {
    super(message);
    this.code = code;
  }
}

export class OfferChangedError extends Error {
  readonly offer: BookingOffer;

  constructor({ offer }: { offer: BookingOffer }) {
    super("The service or rate changed; the current offer is attached");
    this.offer = offer;
  }
}
