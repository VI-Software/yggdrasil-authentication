// TODO: check if this route is actually needed (seems like newer launcher
//       uses DELETE /services/minecraft/profile/skins/active instead)
const { accessTokenToAccount, getSelectedProfile } = require("../../helpers");
const { ForbiddenOperationException } = require("../../exceptions");

const fs = require("fs");

module.exports = (router, db) => {
  router.delete("/user/profile/:uuid/skin", (req, res) => {
    // check auth and find profile
    if (!req.headers.authorization) {
      throw new ForbiddenOperationException("Forbidden", false);
    }
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    const account = accessTokenToAccount(db, accessToken);
    if (!account) {
      throw new ForbiddenOperationException("Invalid token.", true);
    }
    const profile = getSelectedProfile(db, account);
    if (profile.uuid !== req.params.uuid) {
      // make sure UUID is correct
      throw new ForbiddenOperationException("Forbidden", true);
    }

    // remove skin from filesystem
    fs.unlinkSync(`textures/skins/${profile.uuid}`);

    // remove skin from DB
    db.prepare("UPDATE profiles SET skin_variant = 'NONE' WHERE id = ?").run(
      profile.id
    );

    // return
    res.end();
  });
};
