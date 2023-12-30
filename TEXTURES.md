# Configuring textures (skins and capes)

With a default setup, skins and capes will not show up in-game.
Here is the reason why, and how to fix it.

## The problem

Mojang's `authlib` (used by the Notchian client and server) has a whitelisted
domain system when requesting textures:
only URLs whose domain ends in `.minecraft.net` or `.mojang.com` will be
contacted, and others (such as `localhost`) will throw an error and give the
player a Steve or Alex skin. In multiplayer, it also checks for a signature
on the response, which requires Yggdrasil's private key.
Unfortunately, this means that this server can't provide custom skins as the
Minecraft client will reject them as "tampered with".

## The solution

Modding! The best way to fix this is with a client mod (since it is the client
which requests textures) which removes the restrictions from authlib. (Advance
warning: this section contains a lot of modding jargon)

This is slightly harder than it sounds, as authlib is separate from Minecraft,
so it can't be modified with mixins, which is how I would usually do it.
Instead, the other two options would be providing a patched authlib jar [1] to
players, or reimplementing the entire texture-getting method and redirecting
the call to it within the Minecraft client class(es). As most players would be
much more used to installing mods than replacing libraries in their game files,
not to mention that the libraries would likely be overwritten by the launcher,
I decided to go with the second option. You can find this at [Modrinth](https://modrinth.com/mod/unrestricted-textures), but it's unmaintained and janky. A better version will be coming soon in combination with the new per-server login mod.

[1] In fact, even this would be a very bad idea, as authlib has quite a
restrictive license prohibiting redistribution. Instead, I would have to
write a patcher which users would then run on their local copy of authlib,
which is even less likely to happen.

## Alternatively…

If you don't want to have to modify the game at all, you can use textures from
Mojang servers, by setting the URLs to them as overrides, in the config option
`database.overrides.(skins|capes)`. Here is an example of what that might look
like:

```json
"overrides": {
    "skins": {
        "c74c131e-c421-4ee9-b709-cd7969ef1797": "https://textures.minecraft.net/texture/9e078642ddc4cec9912d8c01a810a58f53332eb36b78e5bc32a35d0403225c3b",
        "<uuid>": "<url>",
        "<uuid>": "<url>"
    },
    "capes": {
        "<uuid>": "<url>"
    }
}
```

This will make the textures load even with a completely unmodified server and
client, but it adds the restriction that you can only use skins and capes which
exist on Mojang's servers. Additionally, the skin/cape will not be added to the
profile in the database, so it won't show up when (for example) listing which
capes a player owns.

## Old solutions (ignore)

These were written when I thought the textures were requested by the server,
not the client. These will still work in singleplayer but you're better off
avoiding them - also, the config option `server.internalTexturesUrl` was
removed so that won't work either. These are all assuming your yggdrasil-server
instance is running on localhost; if not, change the URLs accordingly.

### Solution 1: DNS magic

One way to solve the problem is to redirect a domain ending in `.minecraft.net`
or `.mojang.com` to localhost (or wherever you're running this).
This will only work if your yggdrasil-server instance has a dedicated
IP address, or you reconfigure your virtual hosting / shared IP system,
as the Host header will be set by Minecraft as `localhost.minecraft.net`
rather than your real domain name.

The easiest way to do this is probably by adding an entry to your `/etc/hosts`
file, such as:

```
127.0.0.1       localhost.minecraft.net
```

Then, set `server.internalTexturesUrl` in [config.json](./config.json) to
`http://localhost.minecraft.net:<port>`.
Now when your Minecraft server requests a texture, it will receive a URL
ending with `.minecraft.net` but which resolves to localhost, solving the
problem. However, this will not work over HTTPS as the certificate won't match.

### Solution 2: Use a proxy

Another option which does not require modifying system files is to use a proxy.
I won't go into too much detail here on how to do that, but once you have an
appropriate HTTP proxy set up, add a rule which redirects (including setting
the Host header, if you want) `localhost.minecraft.net` to `localhost`.
Then, as above, set `server.internalTexturesUrl` to
`http://localhost.minecraft.net:<port>`.
Finally, add the following to your Minecraft server's JVM args:

```sh
-Dhttp.proxyHost=localhost -Dhttp.proxyPort=<proxy port>
```

If you wish to use HTTPS, you will need to install a CA certificate from your
proxy of choice into the OS's trust store to allow it to intercept and decrypt
traffic. You will also want to change `http` in the JVM args to `https`.

### Solution 3: Patch authlib

This is ultimately the best solution, but requires a little more work
(I am not a Java expert and have no idea how to do this!).
Assuming you have obtained a copy of authlib which is patched to allow requests
to any URL (see below), using that in place of the normal version will allow
it to work without any reconfiguration of yggdrasil-server, and will also
let HTTPS work without installing any extra certificates.

As I mentioned above, I am not good enough at Java programming to create a
patched authlib JAR myself. However, I can tell you exactly what code changes
need to be made to make this work, in case you want to do it:

In package `com.mojang.authlib.yggdrasil`:

```diff
--- a/YggdrasilMinecraftSessionService.java
+++ b/YggdrasilMinecraftSessionService.java
@@ -163,14 +163,6 @@
             return new HashMap<>();
         }

-        for (final Map.Entry<MinecraftProfileTexture.Type, MinecraftProfileTexture> entry : result.getTextures().entrySet()) {
-            final String url = entry.getValue().getUrl();
-            if (!isAllowedTextureDomain(url)) {
-                LOGGER.error("Textures payload contains blocked domain: {}", url);
-                return new HashMap<>();
-            }
-        }
-
         return result.getTextures();
     }
```
