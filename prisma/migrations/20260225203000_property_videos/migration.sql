-- CreateTable
CREATE TABLE "property_videos" (
  "id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_videos_property_id_idx" ON "property_videos"("property_id");

-- AddForeignKey
ALTER TABLE "property_videos"
ADD CONSTRAINT "property_videos_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
