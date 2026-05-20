'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

function normalizeEmail(email) {
  return email && email.trim().toLowerCase();
}

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
          const email = normalizeEmail(profile.emails?.[0]?.value);
          if (!email) {
            return done(new Error('Google account did not provide an email'), null);
          }

          // Try to find by googleId first
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Link an existing email/password account to Google instead of
            // creating a second account with the same email.
            user = await User.findOneAndUpdate(
              { email },
              { $set: { googleId: profile.id } },
              { new: true }
            );
          }

          if (!user) {
            // Create new user
            try {
              user = await User.create({
                name: profile.displayName || email,
                email,
                googleId: profile.id,
              });
            } catch (err) {
              if (err.code !== 11000) throw err;

              // If another request created/linked the user at the same time,
              // reuse that account instead of failing the OAuth login.
              user = await User.findOneAndUpdate(
                { email },
                { $set: { googleId: profile.id } },
                { new: true }
              );
            }
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
