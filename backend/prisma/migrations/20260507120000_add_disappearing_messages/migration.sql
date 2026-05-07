ALTER TABLE "Conversation" ADD COLUMN "disappearingDurationSeconds" INTEGER;
ALTER TABLE "Message" ADD COLUMN "expiresAt" TIMESTAMP(3);
