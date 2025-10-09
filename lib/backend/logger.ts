type Level = "debug" | "info" | "warn" | "error"

interface LogEntry {
  ts: string
  level: Level
  msg: string
  ctx?: Record<string, any>
}

class Logger {
  constructor(private name: string, private min: Level = (process.env.LOG_LEVEL as Level) || "info") {}

  private order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

  private should(level: Level) {
    return this.order[level] >= this.order[this.min]
  }

  private emit(level: Level, msg: string, ctx?: Record<string, any>) {
    if (!this.should(level)) return
    const entry: LogEntry = { ts: new Date().toISOString(), level, msg: `[${this.name}] ${msg}`, ctx }
    // Basic console routing
    const line = ctx ? `${entry.ts} ${entry.level.toUpperCase()} ${entry.msg} ${JSON.stringify(ctx)}` : `${entry.ts} ${entry.level.toUpperCase()} ${entry.msg}`
    if (level === "error") console.error(line)
    else if (level === "warn") console.warn(line)
    else console.log(line)
  }

  debug(msg: string, ctx?: Record<string, any>) { this.emit("debug", msg, ctx) }
  info(msg: string, ctx?: Record<string, any>) { this.emit("info", msg, ctx) }
  warn(msg: string, ctx?: Record<string, any>) { this.emit("warn", msg, ctx) }
  error(msg: string, ctx?: Record<string, any>) { this.emit("error", msg, ctx) }
}

export function createLogger(name: string) {
  return new Logger(name)
}

export const rootLogger = createLogger("app")