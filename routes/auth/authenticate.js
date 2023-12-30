const bcrypt = require("bcrypt");
const {
  getUserObject,
  randomToken,
  getAllProfiles,
  registerAccessToken,
  getProfileObject,
} = require("../../helpers.js");
const {
  BadRequestException,
  ForbiddenOperationException,
} = require("../../exceptions.js");

module.exports = (router, db) => {
  router.post("/authenticate", async (req, res, next) => {
    try {
      // check that if the agent is specified, it's Minecraft 1.x
      if (
        req.body.agent &&
        (req.body.agent.name !== "Minecraft" || req.body.agent.version !== 1)
      ) {
        throw new BadRequestException("Unsupported game.");
      }

      // check that all required fields are given
      if (!req.body.username || !req.body.password) {
        throw new ForbiddenOperationException("Forbidden", false);
      }

      // find user and check password
      const account = db
        .prepare(
          `SELECT *
           FROM accounts
           WHERE email = ?`
        )
        .get(req.body.username);
      if (account === undefined) {
        // if there's no matching account
        throw new ForbiddenOperationException(
          "Invalid credentials. Invalid username or password.",
          true
        );
      }
      const allowed = await bcrypt.compare(
        req.body.password,
        account.password_hash
      );
      if (allowed) {
        // if the password is correct
        const clientToken = req.body.clientToken || randomToken();
        const response = {
          clientToken: clientToken,
          accessToken: registerAccessToken(db, clientToken, account.id),
          availableProfiles: getAllProfiles(db, account.id),
        };
        const selectedProfile = getProfileObject(db, account.selected_profile);
        if (selectedProfile) {
          response.selectedProfile = selectedProfile;
        }
        if (req.body.requestUser) {
          // add the user object if needed
          response.user = getUserObject(db, account.id);
        }
        res.json(response);
      } else {
        // if the password is not correct
        throw new ForbiddenOperationException(
          "Invalid credentials. Invalid username or password.",
          true
        );
      }
    } catch (err) {
      next(err);
    }
  });
};
