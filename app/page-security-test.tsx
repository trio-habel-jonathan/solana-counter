"use client";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (options?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
      signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
      publicKey?: PublicKey;
    };
  }
}

import { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import IDL from "./idl.json";

// Definisikan tipe IDL dengan lebih spesifik
type CounterIDL = typeof IDL & anchor.Idl;
const programIDL = IDL as CounterIDL;

// Definisikan tipe untuk akun Counter berdasarkan IDL
type CounterAccount = {
  count: anchor.BN; // Gunakan anchor.BN untuk tipe u64
};

// Fungsi untuk generate alamat valid (opsional)
function generateValidAddress(): string {
  const keypair = anchor.web3.Keypair.generate();
  return keypair.publicKey.toString();
}

// Fungsi untuk cek keberadaan akun
async function isAccountExists(publicKey: PublicKey): Promise<boolean> {
  try {
    const connection = new Connection("https://fake-solana-api.com", "confirmed");
    const accountInfo = await connection.getAccountInfo(publicKey);
    console.log("isAccountExists result:", accountInfo !== null); // Log buat debug
    return accountInfo !== null;
  } catch (error) {
    console.error("isAccountExists error:", error);
    return false;
  }
}

// Fungsi untuk validasi alamat Solana
function isValidSolanaAddress(address: string): boolean {
  const pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const isValid = pattern.test(address);
  console.log("isValidSolanaAddress:", address, "is valid:", isValid); // Log buat debug
  return isValid;
}

const PROGRAM_ID = new PublicKey(
  "DGmJsbjsife1p3QoueUruomvJXLaYXMwqEFgE4bV4xrg"
);

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [counter, setCounter] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [provider, setProvider] = useState<anchor.AnchorProvider | null>(null);
  const [counterAccount, setCounterAccount] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const connection = new Connection("https://fake-solana-api.com", "confirmed");
  console.log("Connected to network:", connection.rpcEndpoint); // Log buat debug

  const getProvider = (): anchor.AnchorProvider | null => {
    if (typeof window === "undefined") return null;

    try {
      const { solana } = window;
      if (!solana || !solana.isPhantom || !solana.publicKey) {
        console.log("Phantom Wallet tidak terdeteksi atau tidak terhubung");
        return null;
      }
      const wallet = {
        publicKey: solana.publicKey,
        signTransaction: solana.signTransaction,
        signAllTransactions: solana.signAllTransactions,
      };
      const provider = new anchor.AnchorProvider(
        connection,
        wallet,
        { preflightCommitment: "confirmed" }
      );
      return provider;
    } catch (error: unknown) {
      console.error("Error saat membuat provider:", error);
      return null;
    }
  };

  const checkWallet = async () => {
    if (typeof window === "undefined") return;

    const { solana } = window;
    if (solana && solana.isPhantom) {
      try {
        const response = await solana.connect({ onlyIfTrusted: true });
        setWalletAddress(response.publicKey.toString());
        setIsConnected(true);
        const newProvider = getProvider();
        setProvider(newProvider);
        if (newProvider) await setupCounter(newProvider);
      } catch (error: unknown) {
        console.log("Wallet belum terhubung:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined") return;

    try {
      // Validasi jaringan sebelum connect
      if (connection.rpcEndpoint !== clusterApiUrl("devnet")) {
        throw new Error("Invalid network configuration. Must use Devnet.");
      }
      const { solana } = window;
      if (!solana) throw new Error("Phantom Wallet tidak ditemukan");
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
      setIsConnected(true);
      const newProvider = getProvider();
      setProvider(newProvider);
      if (newProvider) await setupCounter(newProvider);
    } catch (error: unknown) {
      setError(`Gagal menghubungkan wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const disconnectWallet = () => {
    if (typeof window === "undefined") return;

    try {
      const { solana } = window;
      if (solana) {
        solana.disconnect();
      }
      setWalletAddress(null);
      setIsConnected(false);
      setProvider(null);
      setCounterAccount(null);
      setError(null);
      setIsInitialized(false);
    } catch (error: unknown) {
      setError(`Error saat memutuskan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handler untuk simulasi koneksi wallet valid tapi nggak autentik
  const simulateInvalidConnect = async (address: string) => {
    console.log("Starting simulateInvalidConnect with address:", address); // Log awal
    try {
      const publicKey = new PublicKey(address); // Pake alamat Phantom yang terdaftar
      if (!isValidSolanaAddress(address)) {
        throw new Error("Alamat wallet tidak valid (regex)");
      }
      if (!(await isAccountExists(publicKey))) {
        throw new Error("Akun wallet tidak ada di blockchain");
      }
      console.log("Validation passed, setting states"); // Log sebelum set state
      setWalletAddress(address); // Set alamat valid
      setIsConnected(true); // Simulasi connect
      const wallet = { publicKey, signTransaction: () => Promise.resolve(new Transaction()), signAllTransactions: () => Promise.resolve([]) };
      const newProvider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
      setProvider(newProvider);
      console.log("Calling setupCounter"); // Log sebelum setup
      await setupCounter(newProvider); // Coba inisialisasi
    } catch (error: unknown) {
      setError(`Simulasi gagal: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Simulasi error:", error);
    }
  };

  const getCounterPDA = async (): Promise<PublicKey> => {
    const [counterPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("counter")], // Sesuai dengan seed di IDL: [99, 111, 117, 110, 116, 101, 114] = "counter"
      PROGRAM_ID
    );
    return counterPDA;
  };

  const setupCounter = async (currentProvider: anchor.AnchorProvider) => {
    console.log("Starting setupCounter with provider:", currentProvider); // Log awal
    if (!currentProvider) {
      setError("Provider tidak tersedia");
      console.log("Provider not available"); // Log kalo null
      return;
    }
    try {
      const counterPDA = await getCounterPDA();
      setCounterAccount(counterPDA);
      console.log("Counter PDA set:", counterPDA.toString()); // Log PDA
      await fetchCounter(currentProvider, counterPDA);
      setIsInitialized(true);
      console.log("SetupCounter completed"); // Log selesai
    } catch (error: unknown) {
      setError(`Counter belum diinisialisasi. Silakan klik 'Inisialisasi Counter'. ${error instanceof Error ? error.message : String(error)}`);
      console.error("SetupCounter error:", error); // Log error
    }
  };

  const initializeCounter = async () => {
    if (!provider) {
      setError("Provider belum diinisialisasi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const program = new anchor.Program(programIDL, PROGRAM_ID, provider);
      const counterPDA = await getCounterPDA();
      const tx = await program.methods
        .initialize()
        .accounts({
          counter: counterPDA,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      console.log("Transaksi initialize dikirim. Signature:", tx);
      await connection.confirmTransaction(tx, "confirmed");
      setCounterAccount(counterPDA);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterPDA);
      setIsInitialized(true);
    } catch (error: unknown) {
      console.error("Error saat inisialisasi:", error);
      if (error && typeof error === 'object' && 'logs' in error) {
        console.error("Logs:", (error as { logs: unknown[] }).logs);
      }
      setError(`Gagal inisialisasi: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounter = async (currentProvider: anchor.AnchorProvider, counterPDA: PublicKey) => {
    console.log("Starting fetchCounter with provider:", currentProvider); // Log awal
    if (!currentProvider) return;
    try {
      const program = new anchor.Program(programIDL, PROGRAM_ID, currentProvider);
      const counterData = (await program.account.counter.fetch(counterPDA)) as CounterAccount;
      setCounter(counterData.count.toNumber());
      setError(null);
      console.log("FetchCounter success, counter:", counterData.count.toNumber()); // Log sukses
    } catch (error: unknown) {
      console.error("Gagal fetch counter:", error);
      setError("Counter belum diinisialisasi. Silakan klik 'Inisialisasi Counter'.");
      setCounter(0);
    }
  };

  const increaseCounter = async () => {
    if (!provider || !counterAccount) {
      setError("Provider atau counter belum diinisialisasi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const program = new anchor.Program(programIDL, PROGRAM_ID, provider);
      const payment = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
      const tx = await program.methods
        .increment(payment)
        .accounts({
          counter: counterAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      await connection.confirmTransaction(tx, "confirmed");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterAccount);
    } catch (error: unknown) {
      setError(`Gagal menambah counter: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const decreaseCounter = async () => {
    if (!provider || !counterAccount) {
      setError("Provider atau counter belum diinisialisasi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const program = new anchor.Program(programIDL, PROGRAM_ID, provider);
      const payment = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
      const tx = await program.methods
        .decrement(payment)
        .accounts({
          counter: counterAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      await connection.confirmTransaction(tx, "confirmed");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterAccount);
    } catch (error: unknown) {
      setError(`Gagal mengurangi counter: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-gray-800 bg-black flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">Solana Counter</h2>
        </div>
        <div>
          {isConnected ? (
            <button
              onClick={disconnectWallet}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white font-medium text-sm transition-all"
              disabled={loading}
            >
              {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="px-4 py-2 bg-[#7B2CBF] hover:bg-[#6A24A8] rounded-lg text-white font-medium text-sm transition-all"
              disabled={loading}
            >
              Connect Wallet
            </button>
          )}
          <button
            onClick={() => simulateInvalidConnect("FHCVCR71Hm1Yrw8JsiURNqCDEUm4pgkB8F4XFic6mwT9")}
            className="ml-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium text-sm transition-all"
          >
            Test Real Wallet
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Status card */}
        <div className="w-full max-w-lg mb-12 rounded-2xl bg-white-800 border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#7B2CBF]' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium text-black">
                  {isConnected ? 'Connected to Solana Devnet' : 'Not Connected'}
                </span>
              </div>
              {counterAccount && (
                <div className="text-xs text-white bg-[#7B2CBF] px-2 py-1 rounded-md">
                  {counterAccount.toString().slice(0, 6)}...{counterAccount.toString().slice(-4)}
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="px-4 text-xs uppercase tracking-wider text-black font-medium">Transaction Info</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-black">Network</span>
              <span className="text-sm font-medium flex items-center text-black">
                <span className="w-2 h-2 bg-[#7B2CBF] rounded-full mr-2"></span>
                Devnet
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-black">Cost Per Transaction</span>
              <span className="text-sm font-medium">0.01 SOL</span>
            </div>
          </div>
        </div>

        {/* Counter display */}
        <div className="w-full max-w-md rounded-3xl bg-white border border-gray-700 p-10 mb-8">
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-medium mb-6 text-black">Current Counter Value</h3>
            <div className="flex items-center space-x-6 mb-8">
              <button
                onClick={decreaseCounter}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-3xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isConnected || !counterAccount || loading}
              >
                -
              </button>
              <div className="text-6xl font-bold text-[#7B2CBF]">
                {counter}
              </div>
              <button
                onClick={increaseCounter}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-[#7B2CBF] hover:bg-[#6A24A8] text-white text-3xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isConnected || !counterAccount || loading}
              >
                +
              </button>
            </div>
            {!isInitialized && (
              <button
                onClick={initializeCounter}
                className="w-full py-3 bg-[#7B2CBF] hover:bg-[#6A24A8] rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !isConnected}
              >
                Initialize Counter
              </button>
            )}
          </div>
        </div>

        {/* Status messages */}
        {loading && (
          <div className="w-full max-w-md bg-[#7B2CBF] bg-opacity-20 border border-[#6A24A8] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              <p className="text-white text-sm">
                Processing transaction... Please approve in your wallet.
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="w-full max-w-md bg-red-900 bg-opacity-20 border border-red-800 rounded-xl p-4">
            <p className="text-red-300 text-sm">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full py-6 px-4 border-t border-gray-800 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            Built with Solana, Anchor & Next.js
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Running on</span>
            <span className="text-xs font-medium px-2 py-1 bg-[#7B2CBF] bg-opacity-30 border border-[#6A24A8] rounded-md text-white">
              Solana Devnet
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}