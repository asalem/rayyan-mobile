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

# License (MIT)
Copyright (c) 2015 Qatar Computing Research Institute


Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.