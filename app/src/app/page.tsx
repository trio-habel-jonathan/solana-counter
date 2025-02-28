"use client";
import { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import IDL from "./idl.json";

const PROGRAM_ID = new PublicKey(
  "DGmJsbjsife1p3QoueUruomvJXLaYXMwqEFgE4bV4xrg"
);

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [counter, setCounter] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [provider, setProvider] = useState<any>(null);
  const [counterAccount, setCounterAccount] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // State baru
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const getProvider = () => {
    try {
      const { solana } = window as any;
      if (!solana || !solana.isPhantom) {
        console.log("Phantom Wallet tidak terdeteksi");
        return null;
      }
      const provider = new anchor.AnchorProvider(
        connection,
        solana,
        { preflightCommitment: "confirmed" }
      );
      return provider;
    } catch (error) {
      console.error("Error saat membuat provider:", error);
      return null;
    }
  };

  const checkWallet = async () => {
    const { solana } = window as any;
    if (solana && solana.isPhantom) {
      try {
        const response = await solana.connect({ onlyIfTrusted: true });
        setWalletAddress(response.publicKey.toString());
        setIsConnected(true);
        const newProvider = getProvider();
        setProvider(newProvider);
        if (newProvider) await setupCounter(newProvider);
      } catch (error) {
        console.log("Wallet belum terhubung:", error);
      }
    }
  };

  const connectWallet = async () => {
    try {
      const { solana } = window as any;
      if (!solana) throw new Error("Phantom Wallet tidak ditemukan");
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
      setIsConnected(true);
      const newProvider = getProvider();
      setProvider(newProvider);
      if (newProvider) await setupCounter(newProvider);
    } catch (error: any) {
      setError(`Gagal menghubungkan wallet: ${error.message}`);
    }
  };

  const disconnectWallet = () => {
    try {
      const { solana } = window as any;
      if (solana) solana.disconnect();
      setWalletAddress(null);
      setIsConnected(false);
      setProvider(null);
      setCounterAccount(null);
      setError(null);
      setIsInitialized(false); // Reset saat disconnect
    } catch (error: any) {
      setError(`Error saat memutuskan: ${error.message}`);
    }
  };

  const getCounterPDA = async () => {
    const [counterPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("counter")],
      PROGRAM_ID
    );
    return counterPDA;
  };

  const setupCounter = async (currentProvider: any) => {
    if (!currentProvider) {
      setError("Provider tidak tersedia");
      return;
    }
    try {
      const counterPDA = await getCounterPDA();
      setCounterAccount(counterPDA);
      await fetchCounter(currentProvider, counterPDA);
      setIsInitialized(true); // Tandai sudah diinisialisasi kalau fetch sukses
    } catch (error: any) {
      setError("Counter belum diinisialisasi. Silakan klik 'Inisialisasi Counter'.");
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
      console.log("IDL yang digunakan:", IDL);
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);
      console.log("Program berhasil dibuat");
      const counterPDA = await getCounterPDA();
      console.log("Counter PDA:", counterPDA.toString());
      const tx = await program.methods
        .initialize()
        .accounts({
          counter: counterPDA,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      console.log("Transaksi dikirim. Signature:", tx);
      const confirmation = await connection.confirmTransaction(tx, "confirmed");
      console.log("Konfirmasi transaksi:", confirmation);
      setCounterAccount(counterPDA);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterPDA);
      setIsInitialized(true); // Tandai sudah diinisialisasi setelah sukses
    } catch (error: any) {
      console.error("Error saat inisialisasi:", error);
      if (error.logs) console.error("Logs:", error.logs);
      setError(`Gagal inisialisasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounter = async (currentProvider: any, counterPDA: PublicKey) => {
    if (!currentProvider) return;
    try {
      const program = new anchor.Program(IDL as any, PROGRAM_ID, currentProvider);
      const counterData = await program.account.counter.fetch(counterPDA);
      setCounter(counterData.count.toNumber());
      setError(null);
    } catch (error: any) {
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
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);
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
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterAccount);
    } catch (error: any) {
      setError(`Gagal menambah counter: ${error.message}`);
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
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);
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
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterAccount);
    } catch (error: any) {
      setError(`Gagal mengurangi counter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWallet();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-6">Penghitung Solana 🚀</h1>
      <div className="mb-6">
        {isConnected ? (
          <p className="text-green-400">
            Wallet Terhubung: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </p>
        ) : (
          <p className="text-red-400">Wallet Belum Terhubung</p>
        )}
      </div>
      <div className="mb-6 flex gap-4">
        {isConnected ? (
          <button
            onClick={disconnectWallet}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold"
            disabled={loading}
          >
            Putuskan Wallet
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold"
            disabled={loading}
          >
            Hubungkan Wallet
          </button>
        )}
      </div>
      {loading && (
        <p className="text-yellow-400 mb-4">
          Memproses transaksi... Harap tunggu dan setujui di wallet Anda.
        </p>
      )}
      {error && (
        <p className="text-red-400 mb-4 max-w-md text-center">
          Error: {error}
        </p>
      )}
      <div className="mb-4">
        <p className="text-sm text-gray-400">
          Biaya per transaksi: 0.01 SOL
        </p>
        {counterAccount && (
          <p className="text-xs text-gray-500">
            Akun Counter: {counterAccount.toString().slice(0, 8)}...
          </p>
        )}
      </div>
      <div className="mt-6 flex items-center space-x-4">
        <button
          onClick={decreaseCounter}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-800 rounded-lg text-white font-bold text-2xl"
          disabled={!isConnected || !counterAccount || loading}
        >
          -
        </button>
        <span className="text-4xl font-bold">{counter}</span>
        <button
          onClick={increaseCounter}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold text-2xl"
          disabled={!isConnected || !counterAccount || loading}
        >
          +
        </button>
      </div>
      {!isInitialized && ( // Hanya tampilkan kalau belum diinisialisasi
        <button
          onClick={initializeCounter}
          className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold"
          disabled={loading || !isConnected}
        >
          Inisialisasi Counter
        </button>
      )}
      <div className="mt-6 text-sm text-gray-500 max-w-md text-center">
        <p>Catatan: Aplikasi ini berjalan di Devnet. Pastikan wallet Anda di Devnet dan punya SOL Devnet.</p>
      </div>
    </main>
  );
}