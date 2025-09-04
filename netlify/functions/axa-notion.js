// Netlify Function: /.netlify/functions/axa-notion
import { Client } from "@notionhq/client";

export const handler = async (event) => {
  // Solo aceptamos POST
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

    // Parámetros
    const {
      mode = "page",               // "page" | "database"
      title = "AXA — Test Global 🚀",
      parentPageId,                // requerido si mode="page"
      databaseId,                  // requerido si mode="database"
      properties = {},             // props extra para DB (ej. Estado, Ejemplo)
      content = []                 // bloques hijo (opcional para páginas)
    } = body;

    if (mode === "database") {
      if (!databaseId) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "databaseId requerido" }) };
      }

      // Detecta la propiedad de título real de la DB (Name/Nombre/etc.)
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
        body: JSON.stringify({ ok: true, type: "database_item", id: resp.id, url: resp.url })
      };
    }

    // Por defecto: crear subpágina bajo una página
    if (!parentPageId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "parentPageId requerido" }) };
    }

    const resp = await notion.pages.create({
      parent: { page_id: parentPageId },
      properties: { title: { title: [{ text: { content: title } }] } },
      children: content
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, type: "page", id: resp.id, url: resp.url }) };

  } catch (err) {
    const msg = err?.body || err?.message || "Unknown error";
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: msg }) };
  }
};

