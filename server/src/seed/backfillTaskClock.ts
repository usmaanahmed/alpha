import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Task } from "../modules/task/task.model.js";

// Run this file with "npm run backfill:task-clock".
//
// Why it exists
// -------------
// A task counts its working time in "work stretches": one stretch for every
// time it sat in "in progress". Those stretches are written by the save hook
// on the task, so every task moved from today onwards keeps its own time.
//
// The tasks that were ALREADY in progress before the clock existed never got
// that first stretch, so they show no time at all and would only start
// counting the next time somebody touched them. This script opens that first
// stretch for them, once.
//
// Where does it say the work began? At updatedAt - the last moment the task
// was changed, which for a task sitting in progress is when it was moved
// there. It is the closest thing to the truth the database still holds, and
// it is never a made up date: it is a moment that really happened to that
// task.
//
// Running it twice is safe. A task that already has an open stretch is left
// exactly as it is.

async function backfillTaskClock() {
  await connectDatabase();

  // Every task that is being worked on right now, whatever organization it
  // belongs to. This is a repair of the data, not a feature of one workspace.
  const tasks = await Task.find({ status: "in_progress" });

  let opened = 0;
  let alreadyCounting = 0;

  for (const task of tasks) {
    const hasOpenSession = task.workSessions.some(
      (session) => session.endedAt === null
    );

    if (hasOpenSession) {
      alreadyCounting = alreadyCounting + 1;
      continue;
    }

    task.workSessions.push({
      startedAt: task.updatedAt,
      endedAt: null,
    });

    // The save hook looks at this same list and finds the stretch already
    // open, so it leaves it alone. updatedAt moves to now, which is correct:
    // the task really was changed just now.
    await task.save();
    opened = opened + 1;
  }

  console.log("");
  console.log("Tasks in progress      :", tasks.length);
  console.log("Clock started for      :", opened);
  console.log("Already counting       :", alreadyCounting);
  console.log("");
  console.log("Their time is counted from the last moment each task changed.");

  await mongoose.disconnect();
}

backfillTaskClock();
