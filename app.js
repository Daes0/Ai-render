const { Highrise } = require("highrise-js-sdk");
const fetch = require("node-fetch"); // Ensure this is imported
const { settings, authentication } = require("./config/config");
const { generatePlayersLength, getUptime, getRandomEmote } = require("./utils/utils");

const bot = new Highrise(authentication.token, authentication.room);

let currentEmote = null;
let emoteInterval = null;
const emoteDuration = 10000; // Set duration to 10 seconds

// Initialize the bot
bot.on('ready', async (client) => {
  console.log(`${settings.botName} is now online in ${settings.roomName} with ${await generatePlayersLength(bot)} players.`);

  // Teleport the bot to the set coordinates
  await bot.player.teleport(
    client,
    settings.coordinates.x, 
    settings.coordinates.y, 
    settings.coordinates.z, 
    settings.coordinates.facing
  );

  console.log(`Bot teleported to (${settings.coordinates.x}, ${settings.coordinates.y}, ${settings.coordinates.z}) facing ${settings.coordinates.facing}.`);
});

// Function to apply a single emote to all players
const applyEmoteToAllPlayers = async (emote) => {
  const players = await bot.room.players.fetch();
  players.forEach(async (player) => {
    const playerId = player[0].id;
    try {
      await bot.player.emote(playerId, emote);
    } catch (error) {
      console.error(`Failed to emote player ${playerId}: ${error.message}`);
    }
  });
};

// Function to start or restart the emote loop
const startEmoteLoop = async (emote) => {
  // Clear existing interval if any
  if (emoteInterval) clearInterval(emoteInterval);

  // Apply the initial emote
  await applyEmoteToAllPlayers(emote);

  // Set up interval to reapply the emote based on duration
  emoteInterval = setInterval(async () => {
    await applyEmoteToAllPlayers(emote);
  }, emoteDuration);
};

// Sunucu oluşturma ve proje aktivitesi sağlama.
const express = require('express');
const app = express();
const port = 3000;

// Web sunucu
app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Sunucu ${port} numaralı bağlantı noktasında yürütülüyor.`);
});

// Function to send a message in chunks if it's too long
const sendMessageInChunks = async (message) => {
  const maxLength = 200; // Adjust the maximum length based on Highrise's message limits
  const chunks = message.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];

  for (const chunk of chunks) {
    await bot.message.send(chunk);
  }
};

// Function to tip a player 5g
const sendTip = async (senderId, receiverId) => {
  try {
    await bot.player.tip(receiverId, 5, 'g'); // Tipping 5g
    bot.message.send(`@${senderId} tipped ${receiverId} 5g! 🤑`);
  } catch (error) {
    console.error(`Failed to tip player ${receiverId}: ${error.message}`);
    bot.message.send(`Failed to tip ${receiverId}, please try again.`);
  }
};

// Handle chat messages
bot.on('chatMessageCreate', async (user, message) => {
  console.log(`(chat): [${user.username}]: ${message}`);
  const prefix = settings.prefix;

  try {
    if (message.startsWith(`${prefix}uptime`)) {
      bot.message.send(await getUptime());
    } else if (message.startsWith(`${prefix}ping`)) {
      const latency = await bot.ping.get();
      bot.message.send(`🤖 The bot latency is: ${latency}ms`);
    } else if (message.startsWith(`${prefix}emote`)) {
      if (settings.moderators.includes(user.id)) {
        const newEmote = getRandomEmote();
        if (currentEmote !== newEmote) {
          currentEmote = newEmote; // Update to new emote
          await startEmoteLoop(currentEmote); // Restart the loop with the new emote
        }
      } else {
        bot.whisper.send(user.id, `You don't have permissions to use this command.`);
      }
    } else if (message.startsWith(`${prefix}tip`)) {
      const args = message.split(' ');
      if (args.length === 2) {
        const receiverUsername = args[1]; // Username to tip
        const players = await bot.room.players.fetch();
        const receiver = players.find(p => p[0].username === receiverUsername);

        if (receiver) {
          await sendTip(user.id, receiver[0].id); // Tip the user
        } else {
          bot.message.send(`User @${receiverUsername} not found.`);
        }
      } else {
        bot.message.send(`Please use the command like this: ${prefix}tip <username>`);
      }
    } else if (message.startsWith(`${prefix}g`)) {
      const prompt = message.replace(`${prefix}g`, "").trim();
      if (prompt.length > 0) {
        try {
          console.log("Sending prompt to API:", prompt);

          const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + process.env["Gemini AI API"],
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
          );

          const result = await response.json();
          console.log("API response:", JSON.stringify(result, null, 2)); // Properly log the entire response

          // Extract the content from the response
          const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

          // Send the response in chunks if it's too long
          await sendMessageInChunks(responseText);

        } catch (error) {
          console.error(`Error generating content: ${error.message}`);
          bot.message.send("Sorry, I couldn't generate a response at the moment.");
        }
      } else {
        bot.message.send("Please provide a prompt after the command.");
      }
    }
  } catch (error) {
    console.error(`Error handling chat message: ${error.message}`);
  }
});

// Event handlers
bot.on('whisperMessageCreate', (user, message) => {
  console.log(`(whisper)[${user.username}]: ${message}`);
});

bot.on('emoteCreate', (sender, receiver, emote) => {
  console.log(`[emoteCreate]: ${sender.username} sent ${emote} to ${receiver.username}`);
});

bot.on('reactionCreate', async (sender, receiver, reaction) => {
  console.log(`[reactionCreate]: ${sender.username} sent ${reaction} to ${receiver.username}`);
  if (settings.moderators.includes(sender.id) && reaction === settings.reactionName) {
    if (!settings.moderators.includes(receiver.id)) {
      bot.whisper.send(receiver.id, `You were kicked by the moderator @${sender.username}.`);
      try {
        await bot.player.kick(receiver.id);
      } catch (error) {
        console.error(`Failed to kick player ${receiver.id}: ${error.message}`);
      }
    } else {
      bot.whisper.send(sender.id, `The player you tried to kick is a moderator.`);
    }
  }
});

bot.on('tipReactionCreate', (sender, receiver, item) => {
  console.log(`[tipReactionCreate]: Tip reaction from ${sender.username} to ${receiver.username}: ${item.amount} ${item.type}`);
  bot.message.send(`@${sender.username} tipped ${receiver.username} ${item.amount} ${item.type} 😎`);
});

bot.on('playerJoin', (user) => {
  console.log(`[playerJoin]: ${user.username}(${user.id}) Joined the room`);
  bot.message.send(`@${user.username} welcome to ${settings.roomName} 🥰`);
});

bot.on('playerLeave', (user) => {
  console.log(`[playerLeave]: ${user.username}(${user.id}) Left the room`);
  bot.message.send(`@${user.username} left the room 👋`);
});

bot.on('TrackPlayerMovement', (position) => {
  if ('x' in position && 'y' in position && 'z' in position && 'facing' in position) {
    console.log(`[TrackPlayerMovement]: Player moved to ${position.x}, ${position.y}, ${position.z}, ${position.facing}`);
  } else if ('entity_id' in position && 'anchor_ix' in position) {
    console.log(`[TrackPlayerMovement]: Player moved to anchor ${position.entity_id} at index ${position.anchor_ix}`);
  }
});