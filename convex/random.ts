export function generateNumericToken(length: number): string {
  const digits: Array<string> = [];

  while (digits.length < length) {
    const bytes = new Uint8Array(length - digits.length);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= 250) {
        continue;
      }
      digits.push(String(byte % 10));
    }
  }

  return digits.join("");
}
