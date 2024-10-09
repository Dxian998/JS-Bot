import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {keygen} from "./lib/jetbrains_keygen.js"

export default {
    data: new SlashCommandBuilder()
        .setName('jetbrains_ide')
        .setDescription('Generates a key for jetbrains ide')
        .addStringOption(option =>
            option
                .setName('ide')
                .setDescription('Which jetbrains IDE')
                .setRequired(true).addChoices(
                {name: "WebStorm", value: "WS"},
                {name: "RustRover", value: "RR"},
                {name: "PyCharm", value: "PC"},
            )),
    async execute(interaction) {
        const ide = interaction.options.getString("ide")
        let key = await keygen(ide, interaction.user.globalName);
        let attachment = new AttachmentBuilder(Buffer.from(key, 'utf-8'), {name: 'key.txt'})
        await interaction.reply({
            content: '',
            ephemeral: true,
            files: [attachment]
        });
    },
};
