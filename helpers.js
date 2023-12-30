// Various helper functions to minimise code duplication

const bcrypt = require("bcrypt");
const randomstring = require("randomstring");
const { v4: uuidv4 } = require("uuid");

const config = require("./config.json");

module.exports = {};

/**
 * Gets a user object, as returned by auth/authenticate with
 * "requestUser": true
 * @param db A reference to the BetterSqlite3.Database
 * @param accountId The account to get info for
 * @returns The user object
 */
module.exports.getUserObject = (db, accountId) => {
  const row = db
    .prepare(
      `SELECT email, id, language, country
                            FROM accounts
                            WHERE id = ?`
    )
    .get(accountId);
  return {
    username: row.email,
    id: row.id,
    properties: [
      {
        name: "preferredLanguage",
        value: row.language,
      },
      {
        name: "registrationCountry",
        value: row.country,
      },
    ],
  };
};

/**
 * Gets a profile object, as seen in "selectedProfile": {...}
 * @param db A reference to the BetterSqlite3.Database
 * @param profileId The profile to get info for
 */
module.exports.getProfileObject = (db, profileId) => {
  const row = db
    .prepare("SELECT name, uuid FROM profiles WHERE id = ?")
    .get(profileId);
  if (row === undefined) {
    return null;
  }
  return module.exports.profileRowToSimpleObject(row);
};

/**
 * Converts a row from the profiles table into a simple profile object
 * @param profile The row, as acquired from a BetterSqlite3.Database
 */
module.exports.profileRowToSimpleObject = (profile) => {
  return {
    name: profile.name,
    id: profile.uuid,
  };
};

/**
 * Converts a row from the profiles table into a profile object with all data
 * @param db a BetterSqlite3.Database
 * @param profile The row, as acquired from db
 */
module.exports.profileRowToFullObject = (db, profile) => {
  const result = {
    id: profile.uuid,
    name: profile.name,
    skins: [],
    capes: [],
  };
  if (profile.skin_variant !== "NONE") {
    result.skins.push({
      id: profile.uuid,
      state: "ACTIVE",
      url: `${config.server.externalUrl}/textures/skins/${profile.uuid}`,
      variant: profile.skin_variant,
    });
  }
  if (profile.capes) {
    const capes = profile.capes.split(",");
    capes.forEach((capeId) => {
      // resolve PK to cape info
      const cape = db
        .prepare(
          `SELECT name, alias
                                        FROM capes
                                        WHERE id = ?`
        )
        .get(capeId);
      result.capes.push({
        id: cape.name,
        state: capeId === profile.active_cape ? "ACTIVE" : "INACTIVE",
        url: `${config.server.externalUrl}/textures/capes/${cape.name}`,
        alias: cape.alias,
      });
    });
  }
  return result;
};

/**
 * Converts a profile row into an object with texture data
 * @param db a BetterSqlite3.Database
 * @param profile The profile row as acquired from db
 * @param internalUrl Whether to use the internal textures URL
 */
module.exports.profileRowToTexturedObject = (db, profile) => {
  const textures = {
    timestamp: Date.now(),
    profileId: profile.uuid,
    profileName: profile.name,
    textures: {},
  };
  const texturesBase = config.server.externalUrl;

  if (profile.skin_variant !== "NONE") {
    // check for override
    if (config.database.overrides.skins[profile.uuid]) {
      textures.textures.SKIN = {
        url: config.database.overrides.skins[profile.uuid],
      };
    } else {
      textures.textures.SKIN = {
        url: `${texturesBase}/textures/skins/${profile.uuid}`,
      };
    }
  }
  if (profile.active_cape) {
    // check for override
    if (config.database.overrides.capes[profile.uuid]) {
      textures.textures.CAPE = {
        url: config.database.overrides.capes[profile.uuid],
      };
    } else {
      const capeName = db
        .prepare("SELECT name FROM capes WHERE id = ?")
        .get(profile.active_cape).name;
      textures.textures.CAPE = {
        url: `${texturesBase}/textures/capes/${capeName}`,
      };
    }
  }
  return {
    id: profile.uuid.replace(/-/g, ""),
    name: profile.name,
    properties: [
      {
        name: "textures",
        value: Buffer.from(JSON.stringify(textures), "utf-8").toString(
          "base64"
        ),
      },
    ],
  };
};

/**
 * Gets all profile objects for user, as seen in "availableProfiles": [...]
 * @param db A reference to the BetterSqlite3.Database
 * @param accountId The account to get info for
 */
module.exports.getAllProfiles = (db, accountId) => {
  const profiles = db
    .prepare(
      `SELECT uuid, name
                                 FROM profiles
                                 WHERE owner = ?`
    )
    .all(accountId);
  if (profiles.length === 0) {
    return [];
  }
  const profileObjects = [];
  profiles.forEach((row) => {
    profileObjects.push(module.exports.profileRowToSimpleObject(row));
  });
  return profileObjects;
};

/**
 * Generates a random string to be used as a token, usually for client tokens.
 * For access tokens, use registerAccessToken.
 * @returns A new 128 character long random string
 */
module.exports.randomToken = () => {
  return randomstring.generate(128);
};

/**
 * Creates a new access token and registers it in the database
 * @param db A reference to the BetterSqlite3.Database
 * @param clientToken The client token to associate this token with
 * @param accountId The account to associate this token with
 * @returns The newly created token
 */
module.exports.registerAccessToken = (db, clientToken, accountId) => {
  const accessToken = randomstring.generate(128);
  const issuedDate = Math.floor(Date.now() / 1000);
  const expiryDate = issuedDate + 604800; // in 1 week
  db.prepare(
    `INSERT INTO tokens(access, client, account, issued, expires)
                VALUES (?, ?, ?, ?, ?)`
  ).run(accessToken, clientToken, accountId, issuedDate, expiryDate);
  return accessToken;
};

/**
 * Checks if an access token is valid and not expired. Also removes all expired
 * tokens. By default, tokens will be considered invalid after 2 days.
 * @param db A reference to the BetterSqlite3.Database
 * @param allowOlder Whether to treat tokens older than 2 days as still valid
 * @param accessToken The access token to verify
 * @param clientToken The client token to verify (optional -- if given, this
 *                    must match the one on record for the access token)
 */
module.exports.verifyAccessToken = (
  db,
  allowOlder,
  accessToken,
  clientToken
) => {
  // remove expired tokens
  db.prepare("DELETE FROM tokens WHERE expires <= ?").run(
    Math.floor(Date.now() / 1000)
  );
  // check validity
  const row = db
    .prepare(
      `SELECT client, issued
                            FROM tokens
                            WHERE access = ?`
    )
    .get(accessToken);
  const valid =
    row !== undefined && (allowOlder || Date.now() / 1000 < row.issued + 86400);
  if (clientToken) {
    return valid && row.client === clientToken;
  } else {
    return valid;
  }
};

/**
 * Gets a token row based on access token, also ensuring its validity
 * @param db A reference to the BetterSqlite3.Database
 * @param accessToken The access token to query
 * @returns The database row
 */
module.exports.getAccessToken = (db, accessToken) => {
  if (module.exports.verifyAccessToken(db, false, accessToken)) {
    return db.prepare("SELECT * FROM tokens WHERE access = ?").get(accessToken);
  } else {
    return null;
  }
};

/**
 * Gets an account row based on access token, also ensuring its validity
 * @param db A reference to the BetterSqlite3.Database
 * @param accessToken The access token to query
 * @returns The database row
 */
module.exports.accessTokenToAccount = (db, accessToken) => {
  if (module.exports.verifyAccessToken(db, false, accessToken)) {
    return db
      .prepare(
        `SELECT *
                           FROM accounts
                           WHERE id = (SELECT account
                                       FROM tokens
                                       WHERE access = ?)`
      )
      .get(accessToken);
  } else {
    return null;
  }
};

/**
 * Gets an account's selected profile
 * @param db A reference to the BetterSqlite3.Database
 * @param accountRow The database row representing the account
 * @returns The database row representing the selected profile
 */
module.exports.getSelectedProfile = (db, accountRow) => {
  return db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(accountRow.selected_profile);
};

/**
 * Creates a new account in the database
 * @param db A reference to the BetterSqlite3.Database
 * @param email The user's email address
 * @param password The user's password in plain text
 * @param language The user's preferred language, formatted like 'en-us'
 * @param country The user's registration country, formatted like 'US'
 */
module.exports.createAccount = async (
  db,
  email,
  password,
  language,
  country
) => {
  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  db.prepare(
    `INSERT INTO accounts(email, password_hash, language, country)
                VALUES (?, ?, ?, ?)`
  ).run(email, passwordHash, language, country);
};

/**
 * Changes the password of the given account
 */
module.exports.updatePassword = async (db, accountId, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  db.prepare("UPDATE accounts SET password_hash = ? WHERE id = ?").run(
    passwordHash,
    accountId
  );
};

/**
 * Creates a new profile and assigns it to an account
 * @param db A reference to the BetterSqlite3.Database
 * @param name The profile's username
 * @param ownerId The account which owns this profile
 * @param chatEnabled Whether to allow chat (default true)
 * @param multiplayerEnabled Whether to allow multiplayer (default true)
 * @param realmsEnabled Whether to allow access to Realms (default true)
 * @param profanityFilterEnabled Whether to filter chat (default false)
 */
module.exports.createProfile = (
  db,
  name,
  ownerId,
  chatEnabled,
  multiplayerEnabled,
  realmsEnabled,
  profanityFilterEnabled
) => {
  const uuid = uuidv4();
  if (chatEnabled === null) {
    chatEnabled = true;
  }
  if (multiplayerEnabled === null) {
    multiplayerEnabled = true;
  }
  if (realmsEnabled === null) {
    realmsEnabled = true;
  }
  if (profanityFilterEnabled === null) {
    profanityFilterEnabled = false;
  }
  const attributes = {
    privileges: {
      onlineChat: { enabled: chatEnabled },
      multiplayerServer: { enabled: multiplayerEnabled },
      multiplayerRealms: { enabled: realmsEnabled },
      telemetry: { enabled: false },
    },
    profanityFilterPreferences: {
      profanityFilterOn: profanityFilterEnabled,
    },
  };
  const created = Math.floor(Date.now() / 1000); // timestamp in seconds

  // add it to the profiles table
  db.prepare(
    `INSERT INTO profiles(uuid, created, owner, name, name_history,
                                     skin_variant, attributes)
                VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid, created, ownerId, name, name, "NONE", JSON.stringify(attributes));

  // if the owner has no profile selected, select this one
  const noProfile =
    db
      .prepare(
        `SELECT selected_profile
                                  FROM accounts
                                  WHERE id = ?`
      )
      .get(ownerId).selected_profile === null;
  if (noProfile) {
    const profileId = db
      .prepare("SELECT id FROM profiles WHERE uuid = ?")
      .get(uuid).id;
    db.prepare("UPDATE accounts SET selected_profile = ? WHERE id = ?").run(
      profileId,
      ownerId
    );
  }
};

/**
 * Adds dashes back into a UUID without them
 * @param badUuid The UUID without dashes
 * @returns The UUID with dashes
 */
module.exports.rehyphenateUuid = (badUuid) => {
  return (
    badUuid.slice(0, 8) +
    "-" +
    badUuid.slice(8, 12) +
    "-" +
    badUuid.slice(12, 16) +
    "-" +
    badUuid.slice(16, 20) +
    "-" +
    badUuid.slice(20, 32)
  );
};
