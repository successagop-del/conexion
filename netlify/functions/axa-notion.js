// netlify/functions/axa-notion.js
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resp(405, { ok: false, error: "Use POST" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const mode = body.mode || "page";

    // 1) Crear PÁGINA bajo una página padre
    if (mode === "page") {
      const { parentPageId, title = "Untitled" } = body;

      if (!parentPageId) {
        return resp(400, { ok: false, error: "Missing parentPageId" });
      }

      const page = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: [
            {
              type: "text",
              text: { content: title },
            },
          ],
        },
      });

      const id = page.id;                       // con guiones
      const clean = id.replace(/-/g, "");       // sin guiones para URL Notion
      const url = `https://www.notion.so/${clean}`;

      return resp(200, { ok: true, type: "page", id, url });
    }

    // 2) Crear ITEM en una BASE DE DATOS
    if (mode === "database") {
      const { databaseId, title = "Untitled", properties = {} } = body;

      if (!databaseId) {
        return resp(400, { ok: false, error: "Missing databaseId" });
      }

      // Forzamos una propiedad de título si la DB usa "Name" como title
      const finalProps = {
        Name: {
          title: [{ type: "text", text: { content: title } }],
        },
        ...properties,
      };

      const page = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: finalProps,
      });

      const id = page.id;
      const clean = id.replace(/-/g, "");
      const url = `https://www.notion.so/${clean}`;

      return resp(200, { ok: true, type: "db_item", id, url });
    }

    return resp(400, { ok: false, error: "Invalid mode (use 'page' or 'database')" });
  } catch (err) {
    console.error(err);
    return resp(500, { ok: false, error: err.message || "Internal Error" });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}


