import { PrismaClient } from "@prisma/client";

const local = new PrismaClient();
const remote = new PrismaClient({
  datasources: {
    db: {
      url: process.env.RAILWAY_DATABASE_URL || ""
    }
  }
});

async function main() {
  if (!process.env.RAILWAY_DATABASE_URL) {
    throw new Error("RAILWAY_DATABASE_URL env var is required");
  }

  const localCounts = await local.$transaction([
    local.property.count(),
    local.propertyPhoto.count(),
    local.propertyVideo.count(),
    local.propertyDoc.count(),
    local.clientComment.count(),
    local.commentAttachment.count()
  ]);

  const [localPropertiesCount] = localCounts;

  console.log("Local DB counts:", {
    properties: localCounts[0],
    photos: localCounts[1],
    videos: localCounts[2],
    docs: localCounts[3],
    comments: localCounts[4],
    attachments: localCounts[5]
  });

  console.log("Clearing target (Railway) tables...");
  await remote.$transaction([
    remote.commentAttachment.deleteMany({}),
    remote.clientComment.deleteMany({}),
    remote.propertyDoc.deleteMany({}),
    remote.propertyVideo.deleteMany({}),
    remote.propertyPhoto.deleteMany({}),
    remote.property.deleteMany({})
  ]);

  const properties = await local.property.findMany({
    include: {
      photos: true,
      videos: true,
      docs: true,
      comments: {
        include: {
          attachments: true
        }
      }
    }
  });

  console.log(`Copying ${properties.length} properties to Railway...`);

  for (const property of properties) {
    await remote.property.create({
      data: {
        id: property.id,
        title: property.title,
        location: property.location,
        contactPhone: property.contactPhone,
        privateNote: property.privateNote,
        areaM2: property.areaM2,
        rentRate: property.rentRate,
        serviceRate: property.serviceRate,
        currency: property.currency,
        monthlyTotal: property.monthlyTotal,
        term: property.term,
        description: property.description,
        visibleToClient: property.visibleToClient,
        showDocsToClient: property.showDocsToClient,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
        photos: {
          create: property.photos.map((photo) => ({
            id: photo.id,
            filePath: photo.filePath,
            sortOrder: photo.sortOrder,
            createdAt: photo.createdAt
          }))
        },
        videos: {
          create: property.videos.map((video) => ({
            id: video.id,
            fileName: video.fileName,
            filePath: video.filePath,
            mimeType: video.mimeType,
            sizeBytes: video.sizeBytes,
            createdAt: video.createdAt
          }))
        },
        docs: {
          create: property.docs.map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            filePath: doc.filePath,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            createdAt: doc.createdAt
          }))
        },
        comments: {
          create: property.comments.map((comment) => ({
            id: comment.id,
            authorType: comment.authorType,
            authorName: comment.authorName,
            telegramUserId: comment.telegramUserId,
            text: comment.text,
            createdAt: comment.createdAt,
            attachments: {
              create: comment.attachments.map((attachment) => ({
                id: attachment.id,
                fileName: attachment.fileName,
                filePath: attachment.filePath,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                createdAt: attachment.createdAt
              }))
            }
          }))
        }
      }
    });
  }

  const remoteCounts = await remote.$transaction([
    remote.property.count(),
    remote.propertyPhoto.count(),
    remote.propertyVideo.count(),
    remote.propertyDoc.count(),
    remote.clientComment.count(),
    remote.commentAttachment.count()
  ]);

  console.log("Railway DB counts after copy:", {
    properties: remoteCounts[0],
    photos: remoteCounts[1],
    videos: remoteCounts[2],
    docs: remoteCounts[3],
    comments: remoteCounts[4],
    attachments: remoteCounts[5]
  });

  if (remoteCounts[0] !== localPropertiesCount) {
    console.warn("Warning: properties count mismatch between local and Railway");
  }
}

main()
  .catch((err) => {
    console.error("Copy failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await local.$disconnect();
    await remote.$disconnect();
  });

