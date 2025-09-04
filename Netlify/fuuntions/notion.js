// Netlify Function: /.netlify/functions/notion
import { Client } from "@notionhq/client";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Use POST" }),
    };
  }

  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    if (!NOTION_TOKEN) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Missing NOTION_TOKEN" }) };
    }

    const notion = new Client({ auth: NOTION_TOKEN });
    const body = JSON.parse(event.body || "{}");

    const {
      mode = "page",               // "page" | "database"
      title = "AXA — Test Global 🚀",
      parentPageId,                // req si mode="page"
      databaseId,                  // req si mode="database"
      properties = {},             // props extra para DB
      content = []                 // bloques hijo (opcional)
    } = body;

    if (mode === "database") {
      if (!databaseId) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "databaseId requerido" }) };
      }

      // Detectar la propiedad de título real de la DB
      const db = await notion.databases.retrieve({ database_id: databaseId });
      const titlePropKey = Object.keys(db.properties).find(k => db.properties[k]?.type === "title");
      if (!titlePropKey) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, error: "DB sin propiedad title" }) };
      }

      const resp = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          [titlePropKey]: { title: [{ text: { content: title } }] },
          ...properties
        }
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, type:"database_item", id: resp.id, url: resp.url })
      };
    }

    // Por defecto: crear subpágina en una página
    if (!parentPageId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "parentPageId requerido" }) };
    }

    const resp = await notion.pages.create({
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: title } }] } },
      children: content
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, type:"page", id: resp.id, url: resp.url }) };

  } catch (err) {
    const msg = err?.body || err?.message || "Unknown error";
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: msg }) };
  }
};

