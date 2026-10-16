export function hitungAngkatanDariNim(nim: string): number {
  if (!/^\d{12}$/.test(nim)) {
    throw new Error("NIM harus terdiri dari 12 digit angka.");
  }
  const duaDigitTahun = nim.slice(0, 2);
  return 2000 + Number(duaDigitTahun);
}