-- CreateTable
CREATE TABLE "properties" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "area_m2" DOUBLE PRECISION NOT NULL,
  "rent_rate" DOUBLE PRECISION NOT NULL,
  "service_rate" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "monthly_total" DOUBLE PRECISION,
  "term" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "visible_to_client" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_photos" (
  "id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_docs" (
  "id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_comments" (
  "id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "telegram_user_id" TEXT NOT NULL,
  "telegram_username" TEXT,
  "text" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_attachments" (
  "id" TEXT NOT NULL,
  "comment_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_photos_property_id_sort_order_idx" ON "property_photos"("property_id", "sort_order");

-- CreateIndex
CREATE INDEX "property_docs_property_id_idx" ON "property_docs"("property_id");

-- CreateIndex
CREATE INDEX "client_comments_property_id_created_at_idx" ON "client_comments"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_attachments_comment_id_idx" ON "comment_attachments"("comment_id");

-- AddForeignKey
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_docs" ADD CONSTRAINT "property_docs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_comments" ADD CONSTRAINT "client_comments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "client_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
