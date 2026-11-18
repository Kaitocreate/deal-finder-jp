
export async function onRequestGet({ request, env }) {
  const appId = env.YAHOO_APP_ID;

  if (!appId) {
    return json({ error: "検索APIの設定がまだ完了していません。" }, 503);
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q || q.length > 100) {
    return json({ error: "検索キーワードを入力してください。" }, 400);
  }

  const api = new URL(
    "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
  );

  api.searchParams.set("appid", appId);
  api.searchParams.set("query", q);
  api.searchParams.set("results", "30");
  api.searchParams.set("in_stock", "true");

  try {
    const response = await fetch(api.toString(), {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return json({ error: "商品検索サービスから応答がありません。" }, 502);
    }

    const data = await response.json();

    const items = (data.hits || [])
      .map((x) => ({
        name: String(x.name || "商品名なし"),
        price: Number(x.price),
        image: x.image?.medium || x.image?.small || "",
        seller: x.seller?.name || "",
        url: x.url || ""
      }))
      .filter(
        (x) =>
          Number.isFinite(x.price) &&
          /^https:\/\//i.test(x.url)
      );

    return json({
      items,
      total: Number(data.totalResultsAvailable || items.length)
    });
  } catch {
    return json({ error: "検索中に通信エラーが発生しました。" }, 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
