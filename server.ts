const FEED_URL = "https://commandline.microsoft.com/feed/";
const PORT = Number(Bun.env.PORT ?? 3000);

const wysePalette = {
  background: "#10110f",
  glow: "#4cff63",
  text: "#39ff5a",
  dim: "#1f7a36",
  border: "#2cff4a",
};

type Story = {
  title: string;
  link: string;
};

async function fetchStories(limit = 10): Promise<Story[]> {
  const response = await fetch(FEED_URL, {
    headers: {
      "User-Agent": "WyseFeedTerminal/1.0",
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    },
  });
  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }
  const xml = await response.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const stories: Story[] = [];

  for (const item of items) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const linkMatch = item.match(/<link>(.*?)<\/link>/i);
    const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? "").trim();
    const link = (linkMatch?.[1] ?? "").trim();

    if (title && link) {
      stories.push({ title, link });
    }
    if (stories.length >= limit) break;
  }

  return stories;
}

function renderPage(stories: Story[], error?: string) {
  const now = new Date();
  const timeStamp = now.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const listItems = stories
    .map(
      (story, index) => `
        <li>
          <span class="index">${String(index + 1).padStart(2, "0")}</span>
          <a href="${story.link}" target="_blank" rel="noreferrer">
            ${story.title}
          </a>
        </li>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Command Line Feed | Wyse Terminal</title>
    <style>
      :root {
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Courier New", Courier, monospace;
        background: ${wysePalette.background};
        color: ${wysePalette.text};
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
      }
      .terminal {
        width: min(920px, 100%);
        border: 2px solid ${wysePalette.border};
        padding: 28px 32px;
        position: relative;
        background: radial-gradient(circle at top left, rgba(76, 255, 99, 0.12), transparent 45%),
          ${wysePalette.background};
        box-shadow: 0 0 18px rgba(76, 255, 99, 0.2);
        text-shadow: 0 0 6px rgba(76, 255, 99, 0.4);
      }
      .terminal::before {
        content: "";
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.15),
          rgba(0, 0, 0, 0.15) 1px,
          transparent 1px,
          transparent 3px
        );
        pointer-events: none;
        mix-blend-mode: screen;
      }
      .status-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        font-size: 0.85rem;
        letter-spacing: 0.08em;
        color: ${wysePalette.dim};
      }
      h1 {
        margin: 0 0 12px;
        font-size: 1.5rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .prompt {
        color: ${wysePalette.dim};
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 12px;
      }
      li {
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 12px;
        align-items: start;
      }
      .index {
        color: ${wysePalette.dim};
      }
      a {
        color: ${wysePalette.text};
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .footer {
        margin-top: 24px;
        font-size: 0.85rem;
        color: ${wysePalette.dim};
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
      }
      .cursor {
        display: inline-block;
        width: 10px;
        height: 1.1em;
        background: ${wysePalette.glow};
        margin-left: 6px;
        animation: blink 1s step-start infinite;
      }
      .error {
        margin: 12px 0;
        color: #ff6b6b;
      }
      @keyframes blink {
        50% {
          opacity: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="terminal">
      <div class="status-bar">
        <span>WYSE-60 READY</span>
        <span>${timeStamp}</span>
      </div>
      <h1>Command Line Feed</h1>
      ${error ? `<p class="error">${error}</p>` : ""}
      <ul>
        ${listItems || "<li>No stories available.</li>"}
      </ul>
      <div class="footer">
        <span>Source: commandline.microsoft.com</span>
        <span>Press F1 for help</span>
      </div>
    </main>
  </body>
</html>`;
}

Bun.serve({
  port: PORT,
  async fetch() {
    try {
      const stories = await fetchStories(10);
      return new Response(renderPage(stories), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(renderPage([], message), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 500,
      });
    }
  },
});

console.log(`Wyse feed terminal running on http://localhost:${PORT}`);
