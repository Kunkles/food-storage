// Reference documents shown on the Reference tab. Each is a page published
// elsewhere; the tab shows the live page when online and the latest saved copy
// when not. `snapshot` is where a copy is saved at build time
// (scripts/fetch-references.mjs) so it works offline from the first visit.
//
// Plain data with no imports, so the build script can read it too.
export const REFERENCES = [
  {
    id: 'uv5rm-guide',
    title: 'UV-5RM Plus GPS Field Guide',
    description:
      'Your Baofeng radio guide: emergency quick start, key-by-key walkthroughs, menus, channel plan, family emergency channels and troubleshooting.',
    liveUrl: 'https://kunkles.github.io/uv5rm-plus-gps-guide/uv5rm-plus-gps-guide.html',
    snapshot: 'reference/uv5rm-plus-gps-guide.html',
  },
]
