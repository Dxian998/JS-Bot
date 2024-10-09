import hydraSource from '../lib/hydra.js';

export default {
    data: {
        name: "Dodi",
        url: "https://hydralinks.cloud/sources/dodi.json"
    },
    async execute(search_term, interaction) {
        await hydraSource(search_term, interaction, this.data.name, this.data.url);
    }
};
