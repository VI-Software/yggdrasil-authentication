const { BadRequestException } = require("../../exceptions");

module.exports = (router, db) => {
  router.post("/profiles/minecraft", (req, res) => {
    // check parameters
    if (!req.body || !req.body[0]) {
      throw new BadRequestException("No body supplied");
    }

    // find all of the ids and names for each supplied username
    results = db
      .prepare(
        `SELECT uuid, name
         FROM profiles
         WHERE name COLLATE NOCASE
         IN (${req.body.map(() => "?").join(",")})`
      )
      .all(req.body);

    // rename uuid to id
    results = results.map((row) => {
      return {
        id: row.uuid,
        name: row.name,
      };
    });

    // return it
    res.json(results);
  });
};
