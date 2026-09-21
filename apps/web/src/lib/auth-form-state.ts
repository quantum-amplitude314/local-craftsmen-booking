export type AuthFormState = {
  error: string | null;
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "role", string>>;
  values?: { name: string; email: string };
};
