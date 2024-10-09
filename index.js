import fs from 'fs';
import path from "path";

import {Client, Collection, Events, GatewayIntentBits, REST, Routes} from 'discord.js';
import config from './config.json' with {type: 'json'};
import {Info, log, Warning} from "./commands/utility/lib/log.js";
import chalk from "chalk";

const client = new Client({intents: [GatewayIntentBits.Guilds]});

client.commands = new Collection();

const foldersPath = path.join(import.meta.dirname, "./commands");
const commandFolders = fs.readdirSync(foldersPath);

const commands = [];
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && !file.includes('game_search'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = (await import(filePath)).default
        if (command.data && command.execute) {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
        } else {
            Warning(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(config.token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Modified this part to handle multiple guild IDs
        for (const guildId of config.guildIds) {
            const data = await rest.put(
                Routes.applicationGuildCommands(config.clientId, guildId),
                {body: commands},
            );
            console.log(`Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`);
        }
    } catch (error) {
        console.error(error);
    }
})();

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
        log(`[Info] ${interaction.user.displayName} (${interaction.user.id}) used /${interaction.commandName}`, false, 'commands')
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = 'There was an error while executing this command. Please try again later or contact support if the issue persists.';
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        } catch (followUpError) {
            console.error('Error sending error message:', followUpError);
            // If we can't respond to the interaction, log it
            log(`[Error] Failed to respond to ${interaction.user.displayName} (${interaction.user.id}) for /${interaction.commandName}`, false, 'errors');
        }
    }
});


client.once(Events.ClientReady, readyClient => {
    Info(`Ready! Logged in as ${chalk.bold(readyClient.user.tag)}`);
});

client.login(config.token);