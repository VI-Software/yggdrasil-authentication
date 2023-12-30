const {
  BadRequestException,
  ForbiddenOperationException,
} = require("../../exceptions");
const { profileRowToTexturedObject } = require("../../helpers");

module.exports = (router, db) => {
  router.get("/session/minecraft/hasJoined", (req, res) => {
    // check required fields are given
    if (!(req.query.username && req.query.serverId)) {
      throw new BadRequestException("One or more required fields was missing.");
    }

    // find profile
    const profile = db
      .prepare("SELECT * FROM profiles WHERE name = ?")
      .get(req.query.username);
    if (!profile) {
      throw new BadRequestException("Profile does not exist.", true);
    } // enablePassthrough ^^^^

    // check IP address if needed
    if (req.query.ip) {
      const ip = db
        .prepare("SELECT ip_addr FROM sessions WHERE id = ?")
        .get(profile.id).ip_addr;
      if (ip !== req.query.ip) {
        throw new ForbiddenOperationException("IP address does not match.");
      }
    }

    // remove from DB
    db.prepare("DELETE FROM sessions WHERE id = ?").run(profile.id);

    // respond
    res.json(profileRowToTexturedObject(db, profile));
  });
};
