// Ubah require menjadi import untuk ESM
import * as anchor from "@coral-xyz/anchor";

export async function deploy(provider: anchor.Provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here
  const program = anchor.workspace.SolanaCounter as anchor.Program;
  // Contoh: Deploy atau lakukan sesuatu dengan program
  console.log("Deploying program:", program.programId.toString());
}

// Jika ingin tetap pakai CommonJS, tambahkan export {}
// const anchor = require("@coral-xyz/anchor");
// module.exports = async function (provider) {
//   anchor.setProvider(provider);
//   const program = anchor.workspace.SolanaCounter;
//   console.log("Deploying program:", program.programId.toString());
// };
// export {};