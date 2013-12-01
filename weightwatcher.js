var git = require('./src/sensors/git');

git.entryIdentityProvider().then(function(uid) {
    console.log('UID:', uid);
}).done();
