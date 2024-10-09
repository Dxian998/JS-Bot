import chalk from "chalk";
import fs from "fs";
import path from "path";
import config from '../../../config.json' with { type: 'json' };

export function log(message, sendToConsole, fileName) {
    if (sendToConsole) console.log(message);

    const logDir = "logs";
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    const logFilePath = path.join(logDir, fileName + '.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFilePath, `[${timestamp}] - ${message}\n`);

    const logLines = fs.readFileSync(logFilePath, 'utf-8').split('\n');
    if (logLines.length > config.maxLinesLog) fs.writeFileSync(logFilePath, logLines.slice(-config.maxLinesLog).join('\n'));
}


export const Info = (message) => console.log(`${chalk.rgb(65, 105, 225)("[Info]")} ${message}`)

export const Warning = (message) => console.log(`${chalk.hex('#FFA500')("[Warning]")} ${message}`)