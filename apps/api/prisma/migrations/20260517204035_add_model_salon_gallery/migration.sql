-- CreateTable
CREATE TABLE "salon_gallery" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salon_gallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salon_gallery_salonId_idx" ON "salon_gallery"("salonId");

-- AddForeignKey
ALTER TABLE "salon_gallery" ADD CONSTRAINT "salon_gallery_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
