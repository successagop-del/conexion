// netlify/functions/axa-notion.js
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { ok: false, error: "Use POST" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const mode = body.mode || "page";

    // === 1) Crear PÁGINA bajo una página padre ==========================
    if (mode === "page") {
      const { parentPageId, title = "Untitled" } = body;
      if (!parentPageId) return respond(400, { ok: false, error: "Missing parentPageId" });

      const page = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: {
            title: [{ type: "text", text: { content: title } }],
          },
        },
      });

      const id = page.id;
      const url = `https://www.notion.so/${id.replace(/-/g, "")}`;
      return respond(200, { ok: true, type: "page", id, url });
    }

    // === 2) Crear ITEM en una BASE DE DATOS =============================
    if (mode === "database") {
      const { databaseId, title = "Untitled", properties = {} } = body;
      if (!databaseId) return respond(400, { ok: false, error: "Missing databaseId" });

      // La mayoría de DBs usan "Name" como property de título
      const finalProps = {
        Name: { title: [{ type: "text", text: { content: title } }] },
        ...properties,
      };

      const page = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: finalProps,
      });

      const id = page.id;
      const url = `https://www.notion.so/${id.replace(/-/g, "")}`;
      return respond(200, { ok: true, type: "db_item", id, url });
    }

    return respond(400, { ok: false, error: "Invalid mode (use 'page' or 'database')" });
  } catch (err) {
    console.error("Function error:", err);
    return respond(500, { ok: false, error: err.message || "Internal Error" });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}


