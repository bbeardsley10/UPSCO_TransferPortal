-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusUpdatedAt" DATETIME,
    "notes" TEXT,
    "receivedAtDestination" BOOLEAN NOT NULL DEFAULT false,
    "receivedAtDestinationAt" DATETIME,
    "enteredIntoSystem" BOOLEAN NOT NULL DEFAULT false,
    "enteredIntoSystemAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transfer" ("createdAt", "fromUserId", "id", "notes", "pdfFileName", "pdfPath", "status", "statusUpdatedAt", "toUserId", "updatedAt") SELECT "createdAt", "fromUserId", "id", "notes", "pdfFileName", "pdfPath", "status", "statusUpdatedAt", "toUserId", "updatedAt" FROM "Transfer";
DROP TABLE "Transfer";
ALTER TABLE "new_Transfer" RENAME TO "Transfer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
