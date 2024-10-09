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
        name: "GameBounty",
        iconURL: "https://cdn.discordapp.com/icons/1132502876015571055/4c492f797eb0763c31ef4418e053f680.webp?size=256",
        url: "https://gamebounty.world/api/getPosts"
    },
    async execute(search_term, interaction) {
        const games = await fetchWithCache(this.data.url, this.data.name.replaceAll(" ", "_").toLowerCase() + ".json")
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
                found.map(game => new StringSelectMenuOptionBuilder()
                    .setLabel(game['title'])
                    .setDescription(trim(game['minidescription']))
                    .setValue(game['id'].toString())
                )
            );

        const response = await interaction.editReply({
            content: "Select a game!", ephemeral: true, components: [new ActionRowBuilder()
                .addComponents(select)],
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const game_selected = await response.awaitMessageComponent({filter: collectorFilter, time: 300_000});
            const game = found.find((game) => game.id.toString() === game_selected.values[0])
            if (game_selected.customId === 'select-game') {
                await game_selected.update({
                    content: ``,
                    embeds: [new EmbedBuilder()
                        .setColor(await getDominantColor(game['banner']))
                        .setTitle(game['title'])
                        .setURL(`https://gamebounty.world/post/${game['id']}`)
                        .setDescription(`${game['minidescription']}`)
                        .addFields(
                            ...(game.genres ? [{name: "Genres", value: game.genres, inline: true}] : []),
                            ...(game.steam_shop ? [{
                                name: "Steam store link",
                                value: game.steam_shop,
                                inline: true
                            }] : [])
                        )
                        .setImage(game['banner'])
                        .setTimestamp(Date.parse(game['created_at']))
                        .setFooter({text: `${this.data.name} • Version: ${game['version'] || 'N/A'}`, iconURL: this.data.iconURL})],
                    components: [new ActionRowBuilder()
                        .addComponents(new ButtonBuilder()
                            .setLabel('Game download')
                            .setURL(game['url'])
                            .setStyle(ButtonStyle.Link))]
                });
            }
        } catch (e) {
            console.warn(e)
            await interaction.editReply({
                content: 'Game not selected within 5 minute.',
                components: []
            });
        }
    },
};