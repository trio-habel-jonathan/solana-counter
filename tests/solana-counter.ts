import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaCounter } from "../target/types/solana_counter";

describe("solana-counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaCounter as Program<SolanaCounter>;

  // Pindahkan pembuatan counter ke luar agar bisa digunakan di kedua test
  const counter = anchor.web3.Keypair.generate();

  it("Initializes the counter", async () => {
    await program.methods.initialize()
      .accounts({
        counter: counter.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    let account = await program.account.counter.fetch(counter.publicKey);
    console.log("Counter Value:", account.count.toString());
  });

  it("Increments the counter", async () => {
    // Gunakan counter yang sama dengan yang diinisialisasi
    await program.methods.increment()
      .accounts({
        counter: counter.publicKey,
      })
      .rpc();

    let account = await program.account.counter.fetch(counter.publicKey);
    console.log("Counter Value After Increment:", account.count.toString());
  });
});
