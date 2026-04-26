export const WORKING_DAYS = 26;

export interface SalaryBreakdown {
  base: number;
  perDay: number;
  epf: number;
  esi: number;
  absentDeduction: number;
  net: number;
  presentDays: number;
  absentDays: number;
}

export function calculateSalary(
  baseSalary: number,
  presentDays: number,
  monthDays: number,
): SalaryBreakdown {
  const perDay = baseSalary / WORKING_DAYS;
  const expectedDays = Math.min(monthDays, WORKING_DAYS);
  const absentDays = Math.max(0, expectedDays - presentDays);
  const epf = baseSalary * 0.25;
  const esi = baseSalary * 0.25;
  const absentDeduction = perDay * absentDays;
  const net = baseSalary - (epf + esi + absentDeduction);
  return {
    base: baseSalary,
    perDay,
    epf,
    esi,
    absentDeduction,
    net,
    presentDays,
    absentDays,
  };
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
