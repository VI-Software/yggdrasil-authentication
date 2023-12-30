const config = require("../../config.json");
const {
  IllegalArgumentException,
  BadRequestException,
} = require("../../exceptions");
const {
  rehyphenateUuid,
  profileRowToTexturedObject,
} = require("../../helpers");

module.exports = (router, db) => {
  router.get("/session/minecraft/profile/:uuid", (req, res) => {
    // can't provide signed data as we don't have Yggdrasil's private key
    if (req.query.unsigned === false) {
      throw new IllegalArgumentException("Unable to sign data.");
    }

    // re-hyphenate the provided uuid
    const uuid = rehyphenateUuid(req.params.uuid);

    // get the profile
    const profile = db
      .prepare("SELECT * FROM profiles WHERE uuid = ?")
      .get(uuid);

    if (!profile) {
      throw new BadRequestException("Profile does not exist.");
    }

    // respond
    res.json(profileRowToTexturedObject(db, profile));
  });
};
