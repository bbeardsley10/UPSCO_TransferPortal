-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "transferType" TEXT NOT NULL DEFAULT 'send',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusUpdatedAt" DATETIME,
    "notes" TEXT,
    "receivedAtDestination" BOOLEAN NOT NULL DEFAULT false,
    "receivedAtDestinationAt" DATETIME,
    "enteredIntoSystem" BOOLEAN NOT NULL DEFAULT false,
    "enteredIntoSystemAt" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transfer" ("createdAt", "enteredIntoSystem", "enteredIntoSystemAt", "fromUserId", "id", "notes", "pdfFileName", "pdfPath", "receivedAtDestination", "receivedAtDestinationAt", "status", "statusUpdatedAt", "toUserId", "transferType", "updatedAt") SELECT "createdAt", "enteredIntoSystem", "enteredIntoSystemAt", "fromUserId", "id", "notes", "pdfFileName", "pdfPath", "receivedAtDestination", "receivedAtDestinationAt", "status", "statusUpdatedAt", "toUserId", "transferType", "updatedAt" FROM "Transfer";
DROP TABLE "Transfer";
ALTER TABLE "new_Transfer" RENAME TO "Transfer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
