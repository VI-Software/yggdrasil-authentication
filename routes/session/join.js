const {
  ForbiddenOperationException,
  BadRequestException,
} = require("../../exceptions");
const {
  rehyphenateUuid,
  getSelectedProfile,
  accessTokenToAccount,
  verifyAccessToken,
} = require("../../helpers");

module.exports = (router, db) => {
  router.post("/session/minecraft/join", (req, res) => {
    // check fields are given
    if (
      !(req.body.accessToken && req.body.selectedProfile && req.body.serverId)
    ) {
      throw new BadRequestException("One or more required fields was missing.");
    }

    // check access token
    if (!verifyAccessToken(db, false, req.body.accessToken)) {
      throw new ForbiddenOperationException("Invalid token.");
    }

    // find profile and check the access token matches
    const uuid = rehyphenateUuid(req.body.selectedProfile);
    const profile = getSelectedProfile(
      db,
      accessTokenToAccount(db, req.body.accessToken)
    );
    if (uuid !== profile.uuid) {
      throw new ForbiddenOperationException("Invalid token.");
    }

    // enter into DB and return
    db.prepare(
      `INSERT INTO sessions(profile, server_id, ip_addr)
       VALUES (?, ?, ?)`
    ).run(profile.id, req.body.serverId, req.ip);
    res.end();
  });
};
