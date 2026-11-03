# Retained supplemental notices

`victory-37.3.6-LICENSE.txt` is the exact response body from
https://raw.githubusercontent.com/FormidableLabs/victory/v37.3.6/LICENSE.txt.
The installed `victory-vendor@37.3.6` package declares `MIT AND ISC` and its
README identifies the wrapper as MIT, but omits its root license file. Its
13 embedded vendor license files are read directly from the installed package.
The version-specific upstream wrapper text fills that distribution gap; it is
not substituted for embedded vendor terms.

`LeoChen-CivicExplorer-MIT.txt` retains the full adaptation/copyright/permission
notice from `src/components/CivicExplorer.tsx`, including the Portfolio v3.0.1
geometry and real-estate Explorer references. Comment decoration was removed;
the notice wording was retained.

`npm run build` runs `generateThirdPartyNotices.mjs` first. The generator reads
the exact non-development lockfile closure and installed license files,
checks installed versions, and fails on absent/empty texts. This conservative
inventory includes type-only and unused packages; it is not a list of only
code reached by the bundler. `leaflet.heat` does not declare a manifest SPDX
identifier; its original license text is retained without guessing one.
The generated public TXT contains original source bytes and SHA256 headings;
the JSON maps each text to its version/source/hash. Both become ordinary
static distribution files in `dist/`, accessible through the footer.

The actual inventory includes `Hippocratic-2.1` for `react-leaflet` and
`@react-leaflet/core`, as well as MIT, ISC, BSD and composite declarations.
Retaining these texts does not certify compatibility, permitted use, complete
compliance or legal conclusions. Dataset terms and basemap attribution remain
separate from software notices.

Exact license bytes include upstream CRLF/blank lines; whitespace lint is disabled only for the retained TXT source/output paths to preserve those original texts. Source code checks remain active.
