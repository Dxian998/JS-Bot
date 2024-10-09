import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import {fetchWithCache, getDominantColor, search, trim} from '../lib/utils.js';

export default {
    data: {
        name: "Digital Zone",
        iconURL: "https://github.com/god0654/games.json/blob/main/icon.png?raw=true",
        url: "https://raw.githubusercontent.com/god0654/games.json/main/games.json"
    },
    async execute(search_term, interaction) {
        const games = await fetchWithCache(this.data.url, this.data.name.replaceAll(" ", "_").toLowerCase() + ".json")
        let found = []
        for (const game of games) if (search(game['name'], search_term) && found.length <= 10) found.push(game);
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
                found.map(game => new StringSelectMenuOptionBuilder()
                    .setLabel(game['name'])
                    .setDescription(trim(game['description']))
                    .setValue(game['id'])
                )
            );

        const response = await interaction.editReply({
            content: "Select a game!", ephemeral: true, components: [new ActionRowBuilder()
                .addComponents(select)],
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const game_selected = await response.awaitMessageComponent({filter: collectorFilter, time: 60_000});
            const game = found.find((game) => game.id === game_selected.values[0])
            if (game_selected.customId === 'select-game') {
                await game_selected.update({
                    content: ``,
                    embeds: [new EmbedBuilder()
                        .setColor(await getDominantColor(game['thumbnail']))
                        .setTitle(game['name'])
                        .setURL(`https://digitalzone.vercel.app/games#${game['id']}`)
                        .setDescription(`**${game['subName']}**\n\n${game['description']}`)
                        .addFields(
                            ...(game.genres ? [{name: "Genres", value: game.genres, inline: true}] : []),
                            ...(game.csrinru ? [{
                                name: "CSRINRU",
                                value: `[Post](${game.csrinru})`,
                                inline: true
                            }] : []),
                            ...(game.link ? [{name: "Game link", value: game.link, inline: true}] : [])
                        )
                        .setImage(game['thumbnail'])
                        .setTimestamp(Date.parse(game['dateUpdated']))
                        .setFooter({text: this.data.name, iconURL: this.data.iconURL})],
                    components: [new ActionRowBuilder()
                        .addComponents(new ButtonBuilder()
                            .setLabel('Game download')
                            .setURL(game['download'])
                            .setStyle(ButtonStyle.Link))]
                });
            }
        } catch (e) {
            await interaction.editReply({
                content: 'Game not selected within 1 minute.',
                components: []
            });
        }
    },
};
