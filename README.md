# System requirements
- Install NodeJS
- Install ionic, bower through npm
- Install local SDKs for local build (e.g. Xcode), otherwise, you can remotely build on the cloud
- Install app dependancies using bower (should install platforms, plugins and www/libs)

# Build instructions
- ionic serve (livereload)
- ionic build --platform {ios,android}  # builds only
- ionic emulate --platform {ios,android} # builds and runs on emulator
- ionic run device --platform {ios,android} # builds and runs on device
