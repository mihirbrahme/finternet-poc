export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function normalize(value: CanonicalJsonValue): CanonicalJsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<{ [key: string]: CanonicalJsonValue }>((accumulator, key) => {
        const child = value[key];
        if (child !== undefined) {
          accumulator[key] = normalize(child);
        }
        return accumulator;
      }, {});
  }

  return value;
}

export function canonicalJson(value: CanonicalJsonValue): string {
  return JSON.stringify(normalize(value));
}
