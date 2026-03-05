import fs from "fs";
import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { loadConfig } from "../config/config";

const maskSecrets = (input: string): string => {
  const patterns = [
    /(oauth:)[a-zA-Z0-9]+/g,
    /(password=)[^\s&]+/gi,
    /(api[_-]?key=)[^\s&]+/gi,
    /(token=)[^\s&]+/gi
  ];

  return patterns.reduce((acc, regex) => acc.replace(regex, "$1***"), input);
};

const formatMessage = (info: winston.Logform.TransformableInfo): string => {
  const timestamp = info.timestamp ?? new Date().toISOString();
  const level = info.level;
  const moduleName = info.module ?? "app";
  const message = typeof info.message === "string" ? maskSecrets(info.message) : "";
  const meta = info.meta ? JSON.stringify(info.meta) : "";
  return `${timestamp} [${level}] [${moduleName}] ${message} ${meta}`.trim();
};

const ensureLogDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const getLogger = (moduleName: string): winston.Logger => {
  const config = loadConfig();
  const logDir = path.resolve(process.cwd(), config.logDir);
  ensureLogDir(logDir);

  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format((info) => {
        info.module = moduleName;
        return info;
      })()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.printf(formatMessage)
      }),
      new DailyRotateFile({
        dirname: logDir,
        filename: `${moduleName}-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxSize: "10m",
        maxFiles: "5",
        options: { encoding: "utf8" },
        format: winston.format.printf(formatMessage)
      })
    ]
  });
};
