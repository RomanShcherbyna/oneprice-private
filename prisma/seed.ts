import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TITLE_PREFIX = "[DEMO]";

const PNG_PLACEHOLDER_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZJ6kAAAAASUVORK5CYII=";

type DemoPropertyInput = {
  title: string;
  location: string;
  areaM2: number;
  rentRate: number;
  serviceRate: number;
  currency: string;
  monthlyTotal: number;
  term: string;
  description: string;
  photos: string[];
  doc: string;
};

function bytesFromBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

async function ensureFile(filePath: string, content: Buffer): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function createDemoFiles(projectRoot: string): Promise<void> {
  const uploadsDemoDir = path.join(projectRoot, "uploads", "demo");
  const pngBuffer = bytesFromBase64(PNG_PLACEHOLDER_BASE64);

  const filesToCreate = [
    "property-1/photo-1.png",
    "property-1/photo-2.png",
    "property-1/photo-3.png",
    "property-2/photo-1.png",
    "property-2/photo-2.png",
    "property-2/photo-3.png",
    "property-3/photo-1.png",
    "property-3/photo-2.png",
    "property-3/photo-3.png",
    "property-1/doc-1.png",
    "property-2/doc-1.png",
    "property-3/doc-1.png"
  ];

  for (const relativeFile of filesToCreate) {
    const absoluteFile = path.join(uploadsDemoDir, relativeFile);
    await ensureFile(absoluteFile, pngBuffer);
  }
}

function buildDemoProperties(): DemoPropertyInput[] {
  return [
    {
      title: `${DEMO_TITLE_PREFIX} БЦ Сенатор — офис 420 м²`,
      location: "Киев, Печерский район, ул. Болсуновская 13-15",
      areaM2: 420,
      rentRate: 24,
      serviceRate: 6,
      currency: "USD",
      monthlyTotal: 12600,
      term: "5 лет",
      description:
        "Современный офис класса A рядом с метро. Готовность к въезду за 30 дней, смешанная планировка, панорамные окна.",
      photos: [
        "demo/property-1/photo-1.png",
        "demo/property-1/photo-2.png",
        "demo/property-1/photo-3.png"
      ],
      doc: "demo/property-1/doc-1.png"
    },
    {
      title: `${DEMO_TITLE_PREFIX} Подол Плаза — офис 680 м²`,
      location: "Киев, Подольский район, ул. Верхний Вал 72",
      areaM2: 680,
      rentRate: 19,
      serviceRate: 5,
      currency: "USD",
      monthlyTotal: 16320,
      term: "3 года",
      description:
        "Этаж с открытой планировкой под команду 70-90 человек. Высокий потолок, готовые переговорные и зона кухни.",
      photos: [
        "demo/property-2/photo-1.png",
        "demo/property-2/photo-2.png",
        "demo/property-2/photo-3.png"
      ],
      doc: "demo/property-2/doc-1.png"
    },
    {
      title: `${DEMO_TITLE_PREFIX} UNIT.City Campus — офис 950 м²`,
      location: "Киев, Шевченковский район, ул. Дорогожицкая 3",
      areaM2: 950,
      rentRate: 21,
      serviceRate: 7,
      currency: "USD",
      monthlyTotal: 26600,
      term: "7 лет",
      description:
        "Кампус с инфраструктурой: паркинг, спортзал, food court. Подходит для HQ, возможен branding и гибридная посадка.",
      photos: [
        "demo/property-3/photo-1.png",
        "demo/property-3/photo-2.png",
        "demo/property-3/photo-3.png"
      ],
      doc: "demo/property-3/doc-1.png"
    }
  ];
}

async function cleanupOldDemoData(): Promise<void> {
  const oldDemoProperties = await prisma.property.findMany({
    where: {
      title: {
        startsWith: DEMO_TITLE_PREFIX
      }
    },
    select: { id: true }
  });

  if (oldDemoProperties.length === 0) {
    return;
  }

  const ids = oldDemoProperties.map((item) => item.id);

  await prisma.property.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });
}

async function seedDemoData(): Promise<void> {
  const root = path.resolve(process.cwd());
  await createDemoFiles(root);
  await cleanupOldDemoData();

  const demoItems = buildDemoProperties();

  for (const [index, item] of demoItems.entries()) {
    const created = await prisma.property.create({
      data: {
        title: item.title,
        location: item.location,
        areaM2: item.areaM2,
        rentRate: item.rentRate,
        serviceRate: item.serviceRate,
        currency: item.currency,
        monthlyTotal: item.monthlyTotal,
        term: item.term,
        description: item.description,
        visibleToClient: true
      }
    });

    await prisma.propertyPhoto.createMany({
      data: item.photos.map((photoPath, photoIndex) => ({
        propertyId: created.id,
        filePath: photoPath,
        sortOrder: photoIndex
      }))
    });

    await prisma.propertyDoc.create({
      data: {
        propertyId: created.id,
        fileName: `demo-brief-${index + 1}.png`,
        filePath: item.doc,
        mimeType: "image/png",
        sizeBytes: bytesFromBase64(PNG_PLACEHOLDER_BASE64).byteLength
      }
    });
  }
}

async function main(): Promise<void> {
  await seedDemoData();
  console.log("Demo seed completed");
}

main()
  .catch((error) => {
    console.error("Demo seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
