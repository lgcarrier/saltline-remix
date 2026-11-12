# Dust ChatGPT Site

This additional Site opens Dust by default and keeps Assault and the untouched Saltline original available in its map selector. It does not replace the earlier Assault Site.

- Project ID: `appgprj_6af5226a77b081919cfc2463445c52c8`
- Assigned origin: `https://saltline-dust.aidaredevils.chatgpt.site`
- Audience: owner-private, the default for a new Site. The request did not change sharing.
- Local Site source checkout: `.site-workspaces/dust/`, excluded from the main repository.
- Hosting manifest: `.site-workspaces/dust/.openai/hosting.json`, with static directory `dist`.

The Site's root `index.html` redirects to `game/dust.html`. The unchanged game files sit together at `game/dust.html`, `game/index.html` (Assault) and `game/original.html`, preserving their relative map links and verified hashes. Runtime assets are embedded in those HTML files; only the original UI fonts make external requests.

From a committed game checkout, prepare the static files with:

```sh
python3 tools/build-dust-site.py --output .site-workspaces/dust/dist
```

`dist/build-manifest.json` records the main repository commit and the SHA-256/size of each game. The Sites source helper commits and pushes the separate static source checkout, packages its `dist`, and publishes that exact source version. Keep its credential in memory/stdin; it is never part of this repository or the deployed files.

The gameplay/rendering evidence remains in [DUST-REVIEW.md](DUST-REVIEW.md). Hosting does not change the unmet photorealistic AAA visual target.
