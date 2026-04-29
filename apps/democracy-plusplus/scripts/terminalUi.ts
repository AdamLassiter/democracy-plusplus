const RESET = "\u001B[0m";
const DIM = "\u001B[2m";
const BOLD = "\u001B[1m";

const FG = {
  slate: "\u001B[38;5;245m",
  cyan: "\u001B[38;5;45m",
  teal: "\u001B[38;5;50m",
  blue: "\u001B[38;5;81m",
  green: "\u001B[38;5;84m",
  lime: "\u001B[38;5;118m",
  amber: "\u001B[38;5;221m",
  orange: "\u001B[38;5;208m",
  red: "\u001B[38;5;203m",
  magenta: "\u001B[38;5;213m",
  white: "\u001B[38;5;255m",
} as const;

type Tone = "info" | "success" | "warn" | "error" | "accent" | "muted";

const TONE_STYLE: Record<Tone, string> = {
  info: FG.blue,
  success: FG.green,
  warn: FG.amber,
  error: FG.red,
  accent: FG.magenta,
  muted: FG.slate,
};

const TONE_SYMBOL: Record<Tone, string> = {
  info: "i",
  success: "+",
  warn: "!",
  error: "x",
  accent: ">",
  muted: "-",
};

const SPINNER_FRAMES = ["◜", "◠", "◝", "◞", "◡", "◟"];

function isInteractive() {
  return Boolean(process.stdout.isTTY);
}

function colorize(value: string, style: string) {
  if (!isInteractive()) {
    return value;
  }

  return `${style}${value}${RESET}`;
}

function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}

function fitLine(value: string) {
  const width = process.stdout.columns ?? 120;
  if (stripAnsi(value).length <= width - 1) {
    return value;
  }

  return `${stripAnsi(value).slice(0, Math.max(0, width - 4))}...`;
}

function writeLine(value = "") {
  process.stdout.write(`${fitLine(value)}\n`);
}

function swatch(tone: Tone, symbol = TONE_SYMBOL[tone]) {
  return colorize(symbol, `${BOLD}${TONE_STYLE[tone]}`);
}

function strong(value: string) {
  return colorize(value, `${BOLD}${FG.white}`);
}

function subtle(value: string) {
  return colorize(value, `${DIM}${FG.slate}`);
}

function formatDuration(start: number) {
  const elapsed = Date.now() - start;
  if (elapsed < 1000) {
    return `${elapsed}ms`;
  }
  if (elapsed < 60_000) {
    return `${(elapsed / 1000).toFixed(1)}s`;
  }

  const minutes = Math.floor(elapsed / 60_000);
  const seconds = Math.round((elapsed % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function banner(title: string, subtitle?: string) {
  writeLine();
  writeLine(colorize("╭──────────────────────────────────────────────╮", FG.cyan));
  writeLine(`${colorize("│", FG.cyan)} ${strong(title)}${" ".repeat(Math.max(0, 44 - title.length))}${colorize("│", FG.cyan)}`);
  if (subtitle) {
    const line = subtitle.slice(0, 42);
    writeLine(`${colorize("│", FG.cyan)} ${colorize(line, FG.teal)}${" ".repeat(Math.max(0, 44 - line.length))}${colorize("│", FG.cyan)}`);
  }
  writeLine(colorize("╰──────────────────────────────────────────────╯", FG.cyan));
}

export function section(title: string, meta?: string) {
  writeLine();
  writeLine(`${colorize("◆", FG.magenta)} ${strong(title)}${meta ? ` ${subtle(meta)}` : ""}`);
}

export function detail(label: string, value: string | number) {
  writeLine(`${subtle(label.padEnd(12, " "))} ${value}`);
}

export function note(message: string, tone: Tone = "info") {
  writeLine(`${swatch(tone)} ${message}`);
}

export function item(name: string, meta?: string, tone: Tone = "info") {
  writeLine(`${swatch(tone)} ${strong(name)}${meta ? ` ${subtle(meta)}` : ""}`);
}

export function summary<T extends object>(title: string, stats: T) {
  const parts = Object.entries(stats as Record<string, string | number>).map(
    ([key, value]) => `${colorize(key, FG.teal)} ${strong(String(value))}`,
  );
  writeLine(`${colorize("◈", FG.lime)} ${strong(title)}  ${parts.join(` ${subtle("•")} `)}`);
}

export function promptLabel(message: string) {
  return `${swatch("accent", "?")} ${strong(message)} `;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createTask(title: string, meta?: string) {
  const start = Date.now();
  const interactive = isInteractive();
  let frame = 0;
  let timer: NodeJS.Timeout | null = null;

  const render = (symbol: string, color: string, trailing?: string) => {
    const line = `${colorize(symbol, `${BOLD}${color}`)} ${strong(title)}${meta ? ` ${subtle(meta)}` : ""}${trailing ? ` ${subtle(trailing)}` : ""}`;
    if (interactive) {
      process.stdout.write(`\r\u001B[2K${fitLine(line)}`);
    } else {
      writeLine(line);
    }
  };

  render(SPINNER_FRAMES[frame], FG.cyan);

  if (interactive) {
    timer = setInterval(() => {
      frame = (frame + 1) % SPINNER_FRAMES.length;
      render(SPINNER_FRAMES[frame], FG.cyan);
    }, 90);
  }

  const finish = (symbol: string, color: string, message?: string) => {
    if (timer) {
      clearInterval(timer);
    }

    const suffix = message ? `${message} · ${formatDuration(start)}` : formatDuration(start);
    render(symbol, color, suffix);
    if (interactive) {
      process.stdout.write("\n");
    }
  };

  return {
    update(nextMeta: string) {
      meta = nextMeta;
      render(SPINNER_FRAMES[frame], FG.cyan);
    },
    succeed(message?: string) {
      finish("✓", FG.green, message);
    },
    warn(message?: string) {
      finish("!", FG.amber, message);
    },
    fail(message?: string) {
      finish("✕", FG.red, message);
    },
  };
}
