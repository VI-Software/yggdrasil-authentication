const {
  ForbiddenOperationException,
  BaseYggdrasilException,
  BadRequestException,
} = require("../../exceptions");
const {
  accessTokenToAccount,
  getSelectedProfile,
  verifyAccessToken,
} = require("../../helpers");

const fs = require("fs");
const multer = require("multer");

module.exports = (router, db) => {
  const storage = multer.diskStorage({
    destination: "textures/skins",
    filename: (req, _file, cb) => {
      // name files by profile UUID
      const account = accessTokenToAccount(
        db,
        req.headers.authorization.replace("Bearer ", "")
      );
      const profile = getSelectedProfile(db, account);
      req.uuid = profile.uuid; // save uuid for later
      cb(null, profile.uuid);
    },
  });
  const upload = multer({ storage: storage });

  // handle uploading skins
  router.post(
    "/minecraft/profile/skins",
    (req, res, next) => {
      // check the auth header first
      if (!req.headers.authorization) {
        throw new ForbiddenOperationException("Forbidden", false);
      }
      const accessToken = req.headers.authorization.replace("Bearer ", "");
      if (verifyAccessToken(db, false, accessToken)) {
        next();
      } else {
        throw new ForbiddenOperationException("Invalid token.", true);
      }
    },
    upload.single("file"),
    (req, res) => {
      // check whether an upload or URL was received
      if (req.body.url) {
        // TODO: handle skin download URLs
        throw new BaseYggdrasilException("Not yet implemented.");
      } else if (req.file) {
        // if there was a file, multer will have already saved it
        // set the skin variant in DB
        db.prepare("UPDATE profiles SET skin_variant = ? WHERE uuid = ?").run(
          req.body.variant.toUpperCase(),
          req.uuid
        );
        res.end();
      } else {
        throw new BadRequestException("Please send a file or URL.");
      }
    }
  );

  // handle deleting skins
  router.delete("/minecraft/profile/skins/active", (req, res) => {
    // check access token and get profile
    if (!req.headers.authorization) {
      throw new ForbiddenOperationException("Forbidden", false);
    }
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    const account = accessTokenToAccount(db, accessToken);
    if (!account) {
      throw new ForbiddenOperationException("Invalid token.", true);
    }
    const profile = getSelectedProfile(db, account);

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
