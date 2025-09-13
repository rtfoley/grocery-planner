-- CreateTable
CREATE TABLE "planning_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start_date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MealAssignment" (
    "planning_session_id" INTEGER NOT NULL,
    "recipe_id" INTEGER,
    "date" DATETIME NOT NULL,

    PRIMARY KEY ("planning_session_id", "date"),
    CONSTRAINT "MealAssignment_planning_session_id_fkey" FOREIGN KEY ("planning_session_id") REFERENCES "planning_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealAssignment_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StapleSelection" (
    "planning_session_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    PRIMARY KEY ("planning_session_id", "item_id"),
    CONSTRAINT "StapleSelection_planning_session_id_fkey" FOREIGN KEY ("planning_session_id") REFERENCES "planning_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StapleSelection_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdhocItem" (
    "planning_session_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "amount" TEXT,

    PRIMARY KEY ("planning_session_id", "item_id"),
    CONSTRAINT "AdhocItem_planning_session_id_fkey" FOREIGN KEY ("planning_session_id") REFERENCES "planning_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdhocItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemExclusion" (
    "planning_session_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,

    PRIMARY KEY ("planning_session_id", "item_id"),
    CONSTRAINT "ItemExclusion_planning_session_id_fkey" FOREIGN KEY ("planning_session_id") REFERENCES "planning_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemExclusion_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
