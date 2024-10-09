import { SlashCommandBuilder } from 'discord.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { log, Warning } from './lib/log.js';

// Helper function to get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getSourceChoices = async () => {
    const foldersPath = path.join(__dirname, './game_search');
    const sourceFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));
    const sources = [];

    for (const file of sourceFiles) {
        const filePath = path.join(foldersPath, file);
        const fileUrl = pathToFileURL(filePath).href; // Convert the file path to a file URL

        try {
            const source = (await import(fileUrl)).default;
            if (source.data && source.execute) {
                sources.push({ name: source.data.name, value: file });
            } else {
                Warning(`The source at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`Failed to import source from ${fileUrl}:`, error);
        }
    }
    return sources;
};

const sources = await getSourceChoices();

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a game.')
        .addStringOption(option =>
            option
                .setName('game')
                .setDescription('Game name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Game Source')
                .setRequired(true)
                .addChoices(...sources),
        ),
    async execute(interaction) {
        const game = interaction.options.getString("game").split(" ");
        const sourceFile = interaction.options.getString("source");
        const sourcePath = path.join(__dirname, 'game_search', sourceFile);
        const sourceUrl = pathToFileURL(sourcePath).href; // Convert the file path to a file URL

        try {
            const source = (await import(sourceUrl)).default;
            await interaction.reply({ content: "Searching...", ephemeral: true });
            source.execute(game, interaction);
            log(`[Info] ${interaction.user.displayName} (${interaction.user.id}) used /search game:${game} source: ${sourceFile.replace('.js', '')}`, false, 'search');
        } catch (error) {
            console.error(`Failed to execute source from ${sourceUrl}:`, error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
};