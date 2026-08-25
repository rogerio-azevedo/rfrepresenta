export type FieldErrors = Record<string, string[] | undefined>;

export type FormActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: FieldErrors;
};

export const initialFormState: FormActionState = { status: "idle" };
