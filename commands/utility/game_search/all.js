import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
  } from "discord.js";
  import {
    fetchWithCache,
    getDominantColor,
    search,
    trim,
  } from "../lib/utils.js";
  import path from "node:path";
  import fs from "node:fs";
  import { Warning } from "../lib/log.js";
  
  async function getAllGames() {
    const foldersPath = path.join(import.meta.dirname);
    const sourceFiles = fs
      .readdirSync(foldersPath)
      .filter((file) => file.endsWith(".js") && !file.includes("all.js"));
    let gamesAll = [];
    for (const file of sourceFiles) {
      const filePath = path.join(foldersPath, file);
      const fileURL = new URL(`file://${filePath}`);
      const source = (await import(fileURL)).default;
      if (source.data && source.data.url) {
        try {
          let games = await fetchWithCache(
            source.data.url,
            source.data.name.replaceAll(" ", "_").toLowerCase() + ".json",
          );
          games = games["downloads"] ? games["downloads"] : games;
          games.forEach((game) => {
            const json = {
              source: source.data.name,
              title: game["title"] || game["name"],
              description:
                game["minidescription"] || game["fileSize"] || game["description"],
              id: `${source.data.name.replaceAll(" ", "-").toLowerCase()}${game["title"] || game["name"]}`,
              download: game["download"] || game["uris"]?.[0] || game["url"],
              date: game["created_at"] || game["dateUpdated"] || game["uploadDate"],
              ...(game["fileSize"] && { fileSize: game["fileSize"] }),
              ...(game["genres"] && { genres: game["genres"] }),
              ...(game["link"] || game["steam_shop"]
                ? { link: game["link"] || game["steam_shop"] }
                : {}),
              ...(game["subName"] && { subName: game["subName"] }),
              ...(game["thumbnail"]
                ? { thumbnail: game["thumbnail"] }
                : game["banner"]
                  ? { thumbnail: game["banner"] }
                  : {}),
              ...(source.data.iconURL && { iconURL: source.data.iconURL }),
              ...(game["id"] && { gameID: game["id"] }),
              ...(game["version"] && { version: game["version"] }),
            };
            gamesAll.push(json);
          });
        } catch (error) {
          console.warn(`Warning: Failed to fetch data from ${source.data.url} - ${error.message}`);
        }
      } else {
        Warning(
          `The command at ${filePath} is missing a required "data" or "url" property.`,
        );
      }
    }
    return gamesAll;
  }
  
  export default {
    data: {
      name: "All",
    },
    async execute(search_term, interaction) {
      const games = await getAllGames();
      let found = [];
      for (const game of games) {
        if (game.title && search(game.title, search_term) && found.length <= 10) {
          found.push(game);
        }
      }
      if (found.length === 0) {
        await interaction.editReply({
          content: "No game found by that name",
          ephemeral: true,
        });
        return;
      }
  
      const select = new StringSelectMenuBuilder()
        .setCustomId("select-game")
        .setPlaceholder("Make a selection of a game!")
        .addOptions(
          found.map((game) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(
                trim(
                  game.source.replaceAll(" ", "-").toLowerCase() +
                    " " +
                    game.title,
                ),
              )
              .setDescription(trim(game.description))
              .setValue(trim(game.id)),
          ),
        );
  
      const response = await interaction.editReply({
        content: "Select a game!",
        ephemeral: true,
        components: [new ActionRowBuilder().addComponents(select)],
      });
  
      const collectorFilter = (i) => i.user.id === interaction.user.id;
  
      try {
        const game_selected = await response.awaitMessageComponent({
          filter: collectorFilter,
          time: 300_000,
        });
  
        const game = found.find(
          (game) => trim(game.id) === game_selected.values[0],
        );
  
        if (!game) {
          throw new Error("Game not found in selection.");
        }
  
        let embed = new EmbedBuilder()
          .setColor("#000000")
          .setTitle(trim(game.title))
          .addFields(
            ...(Array.isArray(game.genres)
              ? [{ name: "Genres", value: game.genres.join(', '), inline: true }]
              : game.genres
              ? [{ name: "Genres", value: String(game.genres), inline: true }]
              : []),
            ...(game.csrinru
              ? [
                  {
                    name: "CSRINRU",
                    value: `[Post](${game.csrinru})`,
                    inline: true,
                  },
                ]
              : []),
            ...(game.link
              ? [{ name: "Store Link", value: game.link, inline: true }]
              : []),
          )
          .setTimestamp(game.date ? Date.parse(game.date) : Date.now());
  
        if (game["thumbnail"])
          embed.setColor(await getDominantColor(game["thumbnail"])) &&
          embed.setImage(game["thumbnail"]);
    
        if (game.source === "GameBounty") {
          embed.setFooter(
            game["iconURL"]
              ? { text: `${game.source} • Version: ${game['version'] || 'N/A'}`, iconURL: game["iconURL"] }
              : { text: `${game.source} • Version: ${game['version'] || 'N/A'}` }
          );
        } else {
          embed.setFooter(
            game["iconURL"]
              ? { text: game.source, iconURL: game["iconURL"] }
              : { text: game.source }
          );
        }
  
        embed.setDescription(
          game.subName && game.description
            ? `**${trim(game.subName)}**\n\n${(game.description)}`
            : game.download && !game.download.startsWith("http")
              ? `\`\`\`${(game.download)}\`\`\``
              : game.description
                ? (game.description)
                : "No description available.",
        );
  
        if (game['source'] === "Digital Zone") {
            embed.setURL(`https://digitalzone.vercel.app/games#${game.gameID}`);
        } else if (game['source'] === "GameBounty") {
            embed.setURL(`https://gamebounty.world/post/${game.gameID}`);
        }
  
        if (game_selected.customId === 'select-game') {
            const components = [];
            if (game.download && game.download.startsWith("http")) {
              components.push(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setLabel('Game download')
                    .setURL(game.download)
                    .setStyle(ButtonStyle.Link)
                )
              );
            }
            await game_selected.update({
              content: ``,
              embeds: [embed],
              components: components
            });
        }
          
      } catch (e) {
        await interaction.editReply({
          content: "Game not selected within 5 minutes.",
          components: [],
        });
        console.warn(e);
      }
    },
  };