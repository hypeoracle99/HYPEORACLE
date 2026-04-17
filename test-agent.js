const url = "https://9s8ct2b5.functions.insforge.app/train-personal-agent";

async function test() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_pubkey: "BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP" })
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}
test();
