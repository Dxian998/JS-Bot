import fs from "fs";
import path from "path";
import sharp from "sharp";
import Vibrant from "node-vibrant";
import {log} from "./log.js";

export function trim(string) {
    return string.length > 97
        ? string.slice(0, 97) + '...'
        : string
}

const cacheDir = path.join(import.meta.dirname, 'caches');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
}

const readCache = (cacheFilePath) => {
    if (fs.existsSync(cacheFilePath)) {
        const cacheData = fs.readFileSync(cacheFilePath);
        return JSON.parse(cacheData);
    }
    return null;
};

const writeCache = (cacheFilePath, data) => {
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
};

export const fetchWithCache = async (url, cacheFileName) => {
    const cacheFilePath = path.join(cacheDir, cacheFileName);
    const cachedData = readCache(cacheFilePath);
    let etag = cachedData?.etag || null;

    const headers = etag ? {'If-None-Match': etag} : {};

    let headersStartTime = performance.now()
    const headResponse = await fetch(url, {method: 'HEAD', headers});
    let headersEndTime = performance.now() - headersStartTime

    if (headResponse.status === 304 && cachedData) {
        log(`[Info Headers] Fetch time for ${cacheFileName}: ${Math.round(headersEndTime)}ms`, false, 'cache');
        return cachedData.data;
    }

    let dataStartTime = performance.now()
    const dataResponse = await fetch(url);
    let dataEndTime = performance.now() - dataStartTime

    const data = await dataResponse.json();
    const newETag = headResponse.headers.get('ETag');

    writeCache(cacheFilePath, {data, etag: newETag});

    log(`[Info Data] Fetch time for ${cacheFileName}: ${Math.round(dataEndTime)}ms`, false, 'cache');

    return data;
};

export async function getDominantColor(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const data = await response.arrayBuffer();
        const buffer = Buffer.from(data);
        const pngBuffer = await sharp(buffer).toFormat("png").toBuffer();
        const palette = await Vibrant.from(pngBuffer).quality(1).getPalette();
        return palette?.Vibrant?.hex || "#09090b";
    } catch (error) {
        console.error("Error processing image:", error);
        return "#09090b";
    }
}

export function search(name, searchTerms) {
    const nameLower = name.toLowerCase();
    return searchTerms.every(term => nameLower.includes(term.toLowerCase()));
}