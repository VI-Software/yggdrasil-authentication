const { ForbiddenOperationException } = require("../../exceptions");
const { getAccessToken, profileRowToFullObject } = require("../../helpers");

module.exports = (router, db) => {
  router.get("/minecraft/profile", (req, res) => {
    // check auth header exists
    if (!req.headers.authorization) {
      throw new ForbiddenOperationException("Forbidden", false);
    }

    // find the token (and make sure it actually exists)
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    const tokenRow = getAccessToken(db, accessToken);
    if (!tokenRow) {
      throw new ForbiddenOperationException("Invalid token.", true);
    }

    // find the account's active profile
    const profile = db
      .prepare(
        `SELECT uuid, name, skin_variant, capes,
                active_cape 
         FROM profiles
         WHERE id = (SELECT selected_profile
                     FROM accounts
                     WHERE id = ?)`
      )
      .get(tokenRow.account);

    // return appropriate data
    res.json(profileRowToFullObject(db, profile));
  });
};
