import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://solana-mainnet.g.alchemy.com/v2/jq4Zj9Zjor_oxzeIl_tx8");
const signature = "4VX1at8M32eciNUi9r2wKvLHJRv7ueMtJGrVtJx7s7QBqnyUwwHv6aNkVGf97sfoUV2teDzjYhKf27ZvaRc54zDw";

async function check() {
  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
  console.log(JSON.stringify(tx, null, 2));
}

check();
