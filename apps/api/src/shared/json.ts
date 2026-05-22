export function toJson(value: unknown) {
  return value === null || value === undefined
    ? undefined
    : JSON.parse(JSON.stringify(value));
}
