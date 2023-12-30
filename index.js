#!/usr/bin/env node

// yggdrasil-server -- self-hostable yggdrasil-compatible MC auth server

const axios = require("axios").default;
const express = require("express");
const fs = require("fs");
const sqlite = require("better-sqlite3");

const config = require("./config.json");

// specify db location in the config file
const db_path = config.database.location;
if (!fs.existsSync(db_path)) {
  require("./init-db")(db_path); // create the database if it doesn't exist
}
const db = sqlite(db_path);

app = express();
app.use("/", express.static("static"));
app.use("/textures", express.static("textures"));
app.use(express.json());

// load API routes from filesystem
const routeDirs = fs.readdirSync("routes");
routeDirs.forEach((subdir) => {
  const files = fs.readdirSync(`routes/${subdir}`);
  const router = express.Router();
  var loadedCount = 0;
  files.forEach((file) => {
    if (file.endsWith(".js")) {
      require(`./routes/${subdir}/${file}`)(router, db);
      loadedCount++;
    }
  });
  app.use(`/${subdir}`, router);
  console.log(`Loaded ${loadedCount} API route(s) for ${subdir}`);
});

// error handler for Yggdrasil-like JSON errors
app.use((err, req, res, next) => {
  if (req.headersSent) {
    return next(err);
  }
  if (err.toJson && err.statusCode) {
    // forward to passthrough destination if enabled
    if (config.passthrough.enabled && !err.disablePassthrough) {
      const serviceName = req.path.split("/")[1];
      const serviceUrl = config.passthrough.servers[serviceName];
      var passthroughUrl = serviceUrl + req.path.replace(`/${serviceName}`, "");
      if (Object.keys(req.query).length > 0) {
        passthroughUrl += `?${Object.entries(req.query)
          .join("&")
          .replace(/,/g, "=")}`;
      }

      const axiosOptions = {
        method: req.method,
        url: passthroughUrl,
        validateStatus: () => true,
      };
      axiosOptions.headers = req.headers;
      delete axiosOptions.headers.host;
      axios(axiosOptions)
        .then((result) => {
          res.status(result.status);
          res.set(result.headers);
          res.send(result.data);
        })
        .catch((reqErr) => {
          return next(reqErr);
        });
    } else {
      res.status(err.statusCode).json(err.toJson(req.path));
    }
  } else {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

// start HTTP server
const port = config.server.port;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
