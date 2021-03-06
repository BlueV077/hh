import { join } from "path";
import { createLogger, format, Logger, transports } from "winston";
import { appDir, createAppDir } from "./configuration";
import { getRuntimeConfig } from "./runtimeConfig";

export enum Label {
	QBITTORRENT = "qbittorrent",
	RTORRENT = "rtorrent",
	DECIDE = "decide",
	PREFILTER = "prefilter",
	CONFIGDUMP = "configdump",
	JACKETT = "jackett",
	SERVER = "server",
	STARTUP = "startup",
}

export let logger: Logger;

const redactionMsg = "[REDACTED]";

function redactUrlPassword(message, urlStr) {
	let url;
	try {
		url = new URL(urlStr);
		if (url.password) {
			const urlDecodedPassword = decodeURIComponent(url.password);
			const urlEncodedPassword = encodeURIComponent(url.password);
			message = message.split(url.password).join(redactionMsg);
			message = message.split(urlDecodedPassword).join(redactionMsg);
			message = message.split(urlEncodedPassword).join(redactionMsg);
		}
	} catch (e) {
		// do nothing
	}
	return message;
}

function redactMessage(message) {
	const runtimeConfig = getRuntimeConfig();

	message = message.split(runtimeConfig.jackettApiKey).join(redactionMsg);

	for (const [key, urlStr] of Object.entries(runtimeConfig)) {
		if (key.endsWith("Url") && urlStr) {
			message = redactUrlPassword(message, urlStr);
		}
	}

	return message;
}

export function initializeLogger(): void {
	createAppDir();
	logger = createLogger({
		level: "info",
		format: format.combine(
			format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			format.errors({ stack: true }),
			format.splat(),
			format.colorize(),
			format.printf(({ level, message, label, timestamp }) => {
				return `${timestamp} ${level}: ${
					label ? `[${label}] ` : ""
				}${redactMessage(message)}`;
			})
		),
		transports: [
			new transports.File({
				filename: join(appDir(), "logs", "error.log"),
				level: "error",
			}),
			new transports.File({
				filename: join(appDir(), "logs", "info.log"),
			}),
			new transports.File({
				filename: join(appDir(), "logs", "verbose.log"),
				level: "silly",
			}),
			new transports.Console({
				level: getRuntimeConfig().verbose ? "silly" : "info",
				format: format.combine(
					format.errors({ stack: true }),
					format.splat(),
					format.colorize(),
					format.printf(({ level, message, label }) => {
						return `${level}: ${
							label ? `[${label}] ` : ""
						}${redactMessage(message)}`;
					})
				),
			}),
		],
	});
}
