export function formatTaxId(value: string) {
  if (value.length === 11) {
    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (value.length === 14) {
    return value.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
}

export function formatPhone(value: string | null) {
  if (!value) return "-";
  if (value.length === 11) {
    return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return value.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

export function formatDate(value: Date | null) {
  if (!value) return "Nunca acessou";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Cuiaba",
  }).format(value);
}

export function formatCurrency(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numberValue)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberValue);
}
