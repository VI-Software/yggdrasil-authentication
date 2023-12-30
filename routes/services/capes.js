const {
  verifyAccessToken,
  accessTokenToAccount,
  getSelectedProfile,
} = require("../../helpers");
const {
  ForbiddenOperationException,
  BadRequestException,
} = require("../../exceptions");

module.exports = (router, db) => {
  router.put("/minecraft/profile/capes/active", (req, res) => {
    console.log(req.body);

    // check received data
    if (!req.headers.authorization) {
      throw new ForbiddenOperationException("Forbidden", false);
    }

    // auth and find profile
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    if (!verifyAccessToken(db, false, accessToken)) {
      throw new ForbiddenOperationException("Invalid token.", true);
    }
    const profile = getSelectedProfile(
      db,
      accessTokenToAccount(db, accessToken)
    );
    if (!profile) {
      throw new BadRequestException("No profile selected.");
    }

    // check cape exists and account owns it
    if (!req.body.capeId) {
      // no capeId may mean the client is trying to activate its cape,
      // in the case that a profile only owns one
      if (profile.capes.split(",").length === 1) {
        req.body.capeId = db
          .prepare(
            `SELECT name
             FROM capes
             WHERE id = ?`
          )
          .get(profile.capes).name;
      } else {
        throw new BadRequestException("No capeId provided.");
      }
    }
    const cape = db
      .prepare("SELECT id FROM capes WHERE name = ?")
      .get(req.body.capeId);
    if (!cape) {
      throw new BadRequestException("cape does not exist");
    }
    if (!profile.capes) {
      throw new BadRequestException("profile does not own cape");
    }
    const ownedCapes = profile.capes.split(",");
    if (!ownedCapes.includes(cape.id.toString())) {
      throw new BadRequestException("profile does not own cape");
    }

    // set cape in db
    db.prepare("UPDATE profiles SET active_cape = ? WHERE id = ?").run(
      cape.id,
      profile.id
    );

    // return
    res.end();
  });

  router.delete("/services/minecraft/profile/capes/active", (req, res) => {
    // find account and profile
    if (!req.headers.authorization) {
      throw new ForbiddenOperationException("Forbidden", false);
    }
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    if (!verifyAccessToken(db, false, accessToken)) {
      throw new ForbiddenOperationException("Invalid token.", true);
    }
    const profile = getSelectedProfile(
      db,
      accessTokenToAccount(db, accessToken)
    );
    if (!profile) {
      throw new BadRequestException("No profile selected.");
    }

    // set cape in db to null
    db.prepare("UPDATE profiles SET active_cape = null WHERE id = ?").run(
      profile.id
    );

    res.end();
  });
};
