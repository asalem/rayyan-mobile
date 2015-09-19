# System requirements
- Install NodeJS
- Install ionic, bower, ios-sim through npm: globally -g
- Install lodash, elementtree, plist through npm: locally
- Install local SDKs for local build (e.g. Xcode)
- Install default Ionic hooks (ionic hooks add)
- Install app dependancies using bower (should install platforms, plugins and www/libs)

# Build instructions
- ionic serve (livereload)
- ionic build --platform {ios,android}  # builds only
- ionic emulate --platform {ios,android} # builds and runs on emulator
- ionic run device --platform {ios,android} # builds and runs on device
