import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

type LogLevel = "INFO" | "WARN" | "ERROR";

class Logger {
  private initialized = false;
  private logFilePath = "";

  init(): void {
    if (this.initialized) {
      return;
    }

    const logDir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logDir, { recursive: true });
    this.logFilePath = path.join(logDir, "gwrap.log");
    this.initialized = true;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("WARN", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("ERROR", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const metaText = meta ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${timestamp}] ${level} ${message}${metaText}\n`;

    if (!this.initialized) {
      console.log(line.trim());
      return;
    }

    fs.appendFileSync(this.logFilePath, line);
    console.log(line.trim());
  }
}

export const logger = new Logger();
