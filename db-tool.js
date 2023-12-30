#!/usr/bin/env node

// Command-line tool for modifying the database in a slightly more friendly way

const fs = require("fs");
const sqlite = require("better-sqlite3");

const helpers = require("./helpers");

const config = require("./config.json");

const help = {
  "add-account": "Params: email password language country",
  "add-profile":
    "Params: name ownerId chatEnabled multiplayerEnabled realmsEnabled profanityFilterEnabled",
  "update-password":
    "Params: email newPassword -- changes the password of the account with given email address",
};

const commands = {
  help: (_db, args) => {
    if (args[0] === undefined) {
      console.error(`Commands: ${Object.keys(commands).join(", ")}`);
    } else if (!Object.keys(help).includes(args[0])) {
      console.error(`No help available for ${args[0]}`);
    } else {
      console.error(help[args[0]]);
    }
  },
  "add-account": (db, args) => {
    if (args.length < 4) throw new Error("not enough arguments");
    helpers.createAccount(db, args[0], args[1], args[2], args[3]);
  },
  "add-profile": (db, args) => {
    if (args.length < 6) throw new Error("not enough arguments");
    helpers.createProfile(
      db,
      args[0],
      args[1],
      args[2] === "true",
      args[3] === "true",
      args[4] === "true",
      args[5] === "true"
    );
  },
  "update-password": (db, args) => {
    if (args.length < 2) throw new Error("not enough arguments");
    const accountId = db
      .prepare("SELECT id FROM accounts WHERE email = ?")
      .get(args[0]).id;
    helpers.updatePassword(db, accountId, args[1]);
  },
};

// check that database exists
if (!fs.existsSync(config.database.location)) {
  console.error("The database does not exist.");
  console.error("Please create it by running index.js.");
  process.exitCode = 1;
  // check that the given command is valid
} else if (process.argv[2] === undefined) {
  console.error(`Try \`node db-tool.js help\``);
} else if (!Object.keys(commands).includes(process.argv[2])) {
  console.error(`Unknown command: ${process.argv[2]}`);
  process.exitCode = 1;
} else {
  const db = sqlite(config.database.location);
  try {
    commands[process.argv[2]](db, process.argv.slice(3));
  } catch (e) {
    console.error(e.toString());
    commands.help(null, [process.argv[2]]);
  }
}
