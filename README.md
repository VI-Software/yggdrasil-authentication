# yggdrasil-server

A self-hostable Minecraft authentication server and profile system, aiming to
be compatible with Mojang's official Yggdrasil servers.
Originally intended to be run by individual Minecraft multiplayer servers to provide a
Microsoft-free way to identify players, but could also be run as a more
publicly available instance used by more than one multiplayer server.

### Passthrough

With `passthrough.enabled` set to `true` in [config.json](./config.json)
(the default), requests which fail locally will be forwarded to the servers
given in `passthrough.servers` instead, which by default correspond to
Mojang Yggdrasil.
This way, players registered locally will be resolved locally, and everyone
else will be resolved remotely.

A possible use case (and the default setup) of this would be on a server where
you want to allow normal Minecraft players to connect, but also make use of
custom authentication.

## Using in production

as per Express docs, you should set the environment variable
`NODE_ENV` to `production`.

## Credits

This project was based on [Winter's yggdrasil server](https://codeberg.org/winter/yggdrasil-server)
