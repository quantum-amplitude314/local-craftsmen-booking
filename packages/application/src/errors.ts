export class DomainError extends Error {
  readonly code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT";

  constructor({ code, message }: { code: DomainError["code"]; message: string }) {
    super(message);
    this.code = code;
  }
}
