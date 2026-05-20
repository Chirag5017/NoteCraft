'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

/**
 * Configure Passport Google OAuth 2.0 strategy.
 * Finds or creates a user by googleId or email.
 */
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          // Try to find by googleId first
          let user = await User.findOne({ googleId: profile.id });

          if (!user && email) {
            // Try to find by email (link existing account)
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              await user.save();
            }
          }

          if (!user) {
            // Create new user
            user = await User.create({
              name: profile.displayName || email,
              email,
              googleId: profile.id,
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

module.exports = passport;
