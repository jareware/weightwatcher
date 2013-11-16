$ /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --disable-web-security --remote-debugging-port=9222

"Network.responseReceived" for the page URL, params.response.timing.requestTime == start time.
"Page.domContentEventFired" that follows, params.timestamp == DOMContentLoaded.
"Page.loadEventFired" that follows, params.timestamp == page load.
