export function formatLastOpened(value?: string) {
  if (!value) return "Never opened";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function truncatePath(value: string, maxLength = 48) {
  if (value.length <= maxLength) return value;
  return `…${value.slice(-(maxLength - 1))}`;
}
