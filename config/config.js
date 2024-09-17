require('dotenv').config(); // Ensure dotenv is required to use environment variables

module.exports = {
  settings: {
    prefix: '/', // The prefix for commands, e.g., /help
    botName: 'Hr.BotHelper', // The bot's name; it must match the in-game name
    ownerName: 'King_Dex', // Your username
    ownerId: process.env.OWNER_ID, // Your user ID from secrets
    botId: process.env.BOT_ID, // Your bot ID from secrets
    developers: ['King_Dex'], // List of developers
    moderators: [process.env.MODERATOR_ID], // List of moderators
    roomName: process.env.ROOM_NAME, // Your room name from secrets
    coordinates: {
      x: 14.5,  // X position of the bot in the room
      y: 10,    // Y position of the bot in the room
      z: 15.5,  // Z position of the bot in the room
      facing: 'FrontRight' // The direction the bot is facing
    },
    reactionName: 'wave' // The reaction name used for kicking players
  },
  authentication: {
    room: process.env.ROOM_ID, // Your room ID from secrets
    token: process.env.API_KEY // Your API key from secrets
  }
};