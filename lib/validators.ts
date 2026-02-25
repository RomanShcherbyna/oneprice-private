import { Prisma } from "@prisma/client";

type PropertyInput = {
  title?: unknown;
  location?: unknown;
  contactPhone?: unknown;
  privateNote?: unknown;
  areaM2?: unknown;
  rentRate?: unknown;
  serviceRate?: unknown;
  currency?: unknown;
  monthlyTotal?: unknown;
  term?: unknown;
  description?: unknown;
  visibleToClient?: unknown;
  showDocsToClient?: unknown;
};

function toNumber(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${field}`);
  }
  return parsed;
}

export function parsePropertyInput(
  data: PropertyInput,
  partial = false
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const requiredFields = [
    "title",
    "location",
    "areaM2",
    "rentRate",
    "serviceRate",
    "currency",
    "term",
    "description"
  ];

  if (!partial) {
    for (const field of requiredFields) {
      if (data[field as keyof PropertyInput] === undefined) {
        throw new Error(`Missing field: ${field}`);
      }
    }
  }

  if (data.title !== undefined) result.title = String(data.title).trim();
  if (data.location !== undefined) result.location = String(data.location).trim();
  if (data.contactPhone !== undefined) result.contactPhone = String(data.contactPhone).trim();
  if (data.privateNote !== undefined) result.privateNote = String(data.privateNote).trim();
  if (data.areaM2 !== undefined) result.areaM2 = toNumber(data.areaM2, "areaM2");
  if (data.rentRate !== undefined) result.rentRate = toNumber(data.rentRate, "rentRate");
  if (data.serviceRate !== undefined) result.serviceRate = toNumber(data.serviceRate, "serviceRate");
  if (data.currency !== undefined) result.currency = String(data.currency).trim();
  if (data.term !== undefined) result.term = String(data.term).trim();
  if (data.description !== undefined) result.description = String(data.description).trim();
  if (data.monthlyTotal !== undefined && data.monthlyTotal !== null && data.monthlyTotal !== "") {
    result.monthlyTotal = toNumber(data.monthlyTotal, "monthlyTotal");
  } else if (data.monthlyTotal === null || data.monthlyTotal === "") {
    result.monthlyTotal = null;
  }
  if (data.visibleToClient !== undefined) {
    result.visibleToClient = Boolean(data.visibleToClient);
  }
  if (data.showDocsToClient !== undefined) {
    result.showDocsToClient = Boolean(data.showDocsToClient);
  }

  return result;
}

export function parsePropertyCreateInput(data: PropertyInput): Prisma.PropertyCreateInput {
  return parsePropertyInput(data, false) as Prisma.PropertyCreateInput;
}

export function parsePropertyUpdateInput(data: PropertyInput): Prisma.PropertyUpdateInput {
  return parsePropertyInput(data, true) as Prisma.PropertyUpdateInput;
}
