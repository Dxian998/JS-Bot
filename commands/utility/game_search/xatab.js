import hydraSource from '../lib/hydra.js';

export default {
    data: {
        name: "Xatab",
        url: "https://hydralinks.cloud/sources/xatab.json"
    },
    async execute(search_term, interaction) {
        await hydraSource(search_term, interaction, this.data.name, this.data.url);
    }
};
