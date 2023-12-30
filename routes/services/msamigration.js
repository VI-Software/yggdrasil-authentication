module.exports = (router, _db) => {
  router.get("/rollout/v1/msamigration", (req, res) => {
    // This is not Microsoft, and never will be, so always return false
    res.json({
      feature: "msamigration",
      rollout: false,
    });
  });
};
