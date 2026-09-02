/**
 * Starts a throwaway in-memory MongoDB and prints its URI. Useful for trying the
 * portal out before a real MongoDB is available. Data is lost on exit.
 *
 *   node --experimental-strip-types scripts/dev-db.ts
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const server = await MongoMemoryServer.create({ instance: { port: 27018, dbName: "iev_tracker" } });

console.log(`\nIn-memory MongoDB running.\n\n  MONGODB_URI="${server.getUri()}iev_tracker"\n`);
console.log("Leave this terminal open. Press Ctrl+C to stop (all data is discarded).\n");

const stop = async () => {
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
