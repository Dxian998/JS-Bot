import {ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder} from 'discord.js';
import {search, trim} from './utils.js';

export default async function hydraSource(search_term, interaction, name, url) {
    const games = (await (await fetch(url)).json())["downloads"];
    let found = []
    for (const game of games) if (search(game['title'], search_term) && found.length <= 10) found.push(game);
    if (found.length === 0) {
        await interaction.editReply({
            content: "No game found by that name", ephemeral: true,
        });
        return
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('select-game')
        .setPlaceholder('Make a selection of a game!')
        .addOptions(
            found.map((game) => new StringSelectMenuOptionBuilder()
                .setLabel(trim(game['title']))
                .setDescription(trim(game['fileSize']))
                .setValue(trim(game['title']))
            )
        );

    const response = await interaction.editReply({
        content: "Select a game!", ephemeral: true, components: [new ActionRowBuilder()
            .addComponents(select)],
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
        const game_selected = await response.awaitMessageComponent({filter: collectorFilter, time: 300_000});
        const game = found.find((game) => trim(game['title']) === trim(game_selected.values[0]))
        if (game_selected.customId === 'select-game') {
            await game_selected.update({
                content: ``,
                embeds: [new EmbedBuilder()
                    .setTitle(game['title'])
                    .setDescription(`\`\`\`${game['uris'][0]}\`\`\``)
                    .setTimestamp(Date.parse(game['uploadDate']))
                    .setFooter({text: `${name} | ${game['fileSize']}`})],
                components: []
            });
        }
    } catch (e) {
        if (e instanceof Error && e.name === 'InteractionCollectorError') {
            await interaction.editReply({
                content: 'Game not selected within 5 minute.',
                components: []
            });
        }
    }
}