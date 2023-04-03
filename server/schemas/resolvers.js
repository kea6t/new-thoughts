const { User, Thought } = require("../models");
const { AuthenticationError } = require("apollo-server-express");
const { signToken } = require("../utils/auth");

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({})
          .select("-__v -password")
          .populate("thoughts")
          .populate("friends");

        return userData;
      }
      throw new AuthenticationError('Not logged in');
    },
    users: async () => {
      return User.find()
        .select("-_v -password")
        .populate("friends")
        .populate("thoughts");
    },
    user: async (parent, { username }) => {
      return User.findOne({ username })
        .select("-_v -password")
        .populate("friends")
        .populate("thoughts");
    },
    thoughts: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Thought.find(params).sort({ createdAt: -1 });
    },
    thought: async (parent, { _id }) => {
      return Thought.findOne({ _id });
    },
  },

  Mutation: {
    // the two mutation resolvers to sign a token and return an object that combines the token with the user's data
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);
      return { token, user };
    },

    // This mutation should only be available to logged-in users, 
    // which is why we first check for the existence of context.user. 
    // Keep in mind that the decoded JWT is only added to context if the verification succeeds. 
    // The token contains the user's username, email, and _id properties, 
    // which become context.user properties and can be used in subsequent Thought.create() and User.findByIdAndUpdate() methods.
    addThought: async (parent, args, context) => {
        if (context.user) {
            const thought = await Thought.create({ ...args, username: context.user.username });

            await User.findByIdAndUpdate(
                { _id: context.user._id },
                { $push: { thoughts: thought._id }},
                { new: true }
            );
            return thought;
        }
        throw new AuthenticationError('You need to be logged in');
    },

    // Because Thought model reactions are stored as arrays, we'll use the Mongo $push operator. 
    // Because we're updating an old thought
    addReaction: async (parent, { thoughtId, reactionBody }, context) => {
        if (context.user) {
            const updatedThought = await Thought.findOneAndUpdate(
                { _id: thoughtId },
                { $push: { reactions: { reactionBody, username: context.user.username }}},
                { new: true, runValidators: true }
            );
            return updatedThought;
        }
        throw new AuthenticationError('You need to be logged in')
    },

    // This mutation will check for new friendId and add them to the current user's friends array. 
    // However, a user cannot be friends with the same person twice, 
    // which is why we use the $addToSet operator rather than $push to prevent duplicate entries.
    addFriend: async (parent, { friendId }, context ) => {
        if (context.user) {
            const updatedUser = await User.findOneAndUpdate(
                { _id: context.user._id },
                { $addToSet: { friends: friendId }},
                { new: true }

            ).populate('friends');

            return updatedUser;
        }
        throw new AuthenticationError('You need to be logged in');
    },

    // Here, the error message doesn't specify whether the email or password is incorrect.
    // If a malicious user is trying to hack into someone's account,
    // for example, we don't want to confirm that they've guessed the email address correctly and
    // only need to focus on the password now.
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AuthenticationError("Incorrect credentials");
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError("Incorrect credentials");
      }

      const token = signToken(user);

      return { token, user };
    },
  },
};

module.exports = resolvers;
