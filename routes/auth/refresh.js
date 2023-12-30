const {
  verifyAccessToken,
  registerAccessToken,
  getUserObject,
  getProfileObject,
} = require("../../helpers");
const { ForbiddenOperationException } = require("../../exceptions");

module.exports = (router, db) => {
  router.post("/refresh", (req, res) => {
    // ensure all required info was provided
    if (!req.body.accessToken || !req.body.clientToken) {
      throw new ForbiddenOperationException("Forbidden", false);
    }

    // check whether the access token and client token are valid
    if (
      !verifyAccessToken(db, true, req.body.accessToken, req.body.clientToken)
    ) {
      throw new ForbiddenOperationException("Invalid token.", true);
    }

    // register a new token and delete the old one
    const accountId = db
      .prepare(
        `SELECT account
         FROM tokens
         WHERE access = ?`
      )
      .get(req.body.accessToken).account;
    const newAccessToken = registerAccessToken(
      db,
      req.body.clientToken,
      accountId
    );
    db.prepare("DELETE FROM tokens WHERE access = ?").run(req.body.accessToken);

    // return data
    const response = {
      accessToken: newAccessToken,
      clientToken: req.body.clientToken,
    };
    const account = db
      .prepare("SELECT * FROM accounts WHERE id = ?")
      .get(accountId);
    const selectedProfile = getProfileObject(db, account.selected_profile);
    if (selectedProfile) {
      response.selectedProfile = selectedProfile;
    }
    if (req.body.requestUser) {
      // add the user object if needed
      response.user = getUserObject(db, account.id);
    }
    res.json(response);
  });
};
