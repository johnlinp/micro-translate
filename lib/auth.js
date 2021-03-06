var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

var models = require('./models.js');

var createUser = function(profile, socialKey, callback) {
    var newUser = new models.User();

    newUser.displayName = profile.displayName;
    newUser[socialKey] = profile.id;

    if (profile.photos && profile.photos.length > 0) {
        newUser.avatarUrl = profile.photos[0].value;
    }

    newUser.save(function(err) {
        callback(err, newUser);
    });
};

var findOrCreateUser = function(socialKey, profile, done) {
    var query = {};
    query[socialKey] = profile.id;

    models.User.findOne(query).exec(function(err, user) {
        if (user) {
            done(err, user);
            return;
        }

        createUser(profile, socialKey, function(err, newUser) {
            done(err, newUser);
        });
    });
};

module.exports = {};

module.exports.init = function() {
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        models.User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, function(accessToken, refreshToken, profile, done) {
        findOrCreateUser('googleId', profile, done);
    }));

    passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_ID,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: "/auth/twitter/callback"
    }, function(accessToken, refreshToken, profile, done) {
        findOrCreateUser('twitterId', profile, done);
    }));
};

module.exports.setApp = function(app) {
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/auth/google', passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/plus.login']
    }));

    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), function(request, response) {
        response.redirect('/');
    });

    app.get('/auth/twitter', passport.authenticate('twitter'));

    app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/login' }));
};

