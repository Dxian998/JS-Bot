import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {keygen} from "./lib/jetbrains_keygen.js"

export default {
    data: new SlashCommandBuilder()
        .setName('jetbrains_plugin')
        .setDescription('Generates a key for jetbrains plugin')
        .addStringOption(option =>
            option
                .setName('link')
                .setDescription('Plugin link')
                .setRequired(true)
        ),
    async execute(interaction) {
        const link = interaction.options.getString("link")
        let key = await keygen(link, interaction.user.globalName);
        let attachment = new AttachmentBuilder(Buffer.from(key, 'utf-8'), {name: 'key.txt'})
        await interaction.reply({
            content: '',
            ephemeral: true,
            files: [attachment]
        });
    },
};
