// Create a database with the right tables and columns

const fs = require("fs");
const sqlite = require("better-sqlite3");

module.exports = (db_path) => {
  if (fs.existsSync(db_path)) {
    console.log(`There's already a file at ${db_path}, refusing to clobber it`);
    return false;
  } else {
    // connecting to a nonexistent db will automatically create it
    const db = sqlite(db_path);
    // create the tables
    db.pragma("foreign_keys = ON");
    db.exec(`
            CREATE TABLE accounts(
                id INTEGER PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                language TEXT NOT NULL,
                country TEXT NOT NULL,
                selected_profile INTEGER,
                FOREIGN KEY(selected_profile) REFERENCES profiles(id)
            );
            CREATE TABLE tokens(
                id INTEGER PRIMARY KEY,
                access STRING NOT NULL UNIQUE,
                client STRING NOT NULL,
                account INTEGER NOT NULL,
                issued INTEGER NOT NULL,
                expires INTEGER NOT NULL,
                FOREIGN KEY(account) REFERENCES accounts(id)
            );
            CREATE TABLE profiles(
                id INTEGER PRIMARY KEY,
                uuid TEXT NOT NULL UNIQUE,
                created INTEGER NOT NULL,
                owner INTEGER NOT NULL,
                name TEXT NOT NULL UNIQUE,
                name_history TEXT NOT NULL,
                skin_variant TEXT NOT NULL,
                capes TEXT,
                active_cape INTEGER,
                attributes TEXT NOT NULL,
                challenges TEXT,
                FOREIGN KEY(owner) REFERENCES accounts(id),
                FOREIGN KEY(active_cape) REFERENCES capes(id)
            );
            CREATE TABLE sessions(
                id INTEGER PRIMARY KEY,
                profile INTEGER NOT NULL,
                server_id TEXT NOT NULL,
                ip_addr TEXT NOT NULL,
                FOREIGN KEY(profile) REFERENCES profiles(id)
            );
            CREATE TABLE capes(
                id INTEGER PRIMARY KEY,
                friendly_id TEXT NOT NULL UNIQUE,
                alias TEXT NOT NULL
            );
            CREATE TABLE challenges(
                id INTEGER PRIMARY KEY,
                question TEXT NOT NULL UNIQUE
            );
            CREATE TABLE blocked_servers(
                id INTEGER PRIMARY KEY,
                pattern TEXT NOT NULL UNIQUE,
                sha1 TEXT NOT NULL UNIQUE,
                reason TEXT
            );
        `);
  }
  return true;
};
