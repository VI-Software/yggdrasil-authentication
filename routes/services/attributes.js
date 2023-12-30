const {
  verifyAccessToken,
  accessTokenToAccount,
  getSelectedProfile,
} = require("../../helpers");
const { ForbiddenOperationException } = require("../../exceptions");

module.exports = (router, db) => {
  router.get("/player/attributes", (req, res) => {
    // verify token, find account, get selected profile
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

    // return attributes (very simple)
    res.json(JSON.parse(profile.attributes));
  });
};
