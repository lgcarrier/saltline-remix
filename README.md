# Saltline Remix

A remix of **Saltline**, the fully procedural browser FPS by [Felix Rieseberg](https://x.com/felixrieseberg/status/2119925633564463609) ([play the original](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp)). Every texture, model and sound is generated in code; nothing is downloaded.

This remix keeps all of the original's materials, props, enemies, weapon, effects and audio, and swaps in a new map layout:

- A central RTG crane gantry ("RTG-07") with a corridor running beneath it
- A denser maze of stacked 20' and 40' containers, with catwalks and stairs
- Relays moved: A in the container yard, B inside the shed, C on the north quay
- Extraction boat moved to the south pier

## Play

Open `index.html` in a modern desktop browser (WebGL2 required). `original.html` is the unmodified game for comparison.

Handy URL params from the original: `?show=mats`, `?show=enemies`, `?show=level` to view one module, `?tex=512` for lower texture resolution, `?bench` for a benchmark flythrough.

## Status

Boots to the title and starts a game. Collisions, enemy pathing, relay interaction and the extraction sequence on the new layout have not been fully play-tested yet.

![Gantry corridor](screenshots/02-gantry-corridor.png)
![Top-down](screenshots/05-topdown.png)

All credit for the engine, assets and audio goes to the original Saltline.
