# 🚀 Solana Counter DApp

A decentralized counter application built with **Solana, Anchor, Next.js, and TypeScript**. This project demonstrates **smart contract interactions** on the Solana blockchain, allowing users to initialize, increment, and decrement a counter with a **0.01 SOL transaction fee**. It also includes **comprehensive security testing** inspired by the **OWASP Top 10**, focusing on **Broken Authentication** and **Security Misconfiguration** vulnerabilities.

---

## 📌 Table of Contents
- [✨ Features](#-features)
- [🛠️ Technologies](#-technologies)
- [📥 Installation](#-installation)
- [🚀 Usage](#-usage)
- [🔒 Security Testing](#-security-testing)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [📧 Contact](#-contact)

---

## ✨ Features
✔️ Connect to **Solana Devnet** using **Phantom Wallet**  
✔️ Initialize a counter and **increment/decrement** values with a **0.01 SOL fee per transaction**  
✔️ **Real-time** transaction status and counter value updates  
✔️ **Dedicated security test page** to analyze authentication & network vulnerabilities (local only)  

---

## 🛠️ Technologies

| Component  | Technology |
|------------|------------|
| **Frontend** | Next.js, TypeScript, Tailwind CSS |
| **Blockchain** | Solana, Anchor (Rust for smart contract) |
| **Wallet** | Phantom |
| **Libraries** | `@solana/web3.js`, `@project-serum/anchor` |

---

## 📥 Installation
```bash
# Clone the repository
git clone https://github.com/kuzuma/solana-counter.git
cd solana-counter/app

# Install dependencies
npm install

# Run the development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🚀 Usage
1️⃣ **Connect Wallet**: Click "Connect Wallet" and approve in Phantom to link your Solana account.  
2️⃣ **Initialize Counter**: Click "Initialize Counter" to set up the counter (requires wallet connection).  
3️⃣ **Increment/Decrement**: Use the `+` and `-` buttons to modify the counter value (**0.01 SOL fee per action**).  
4️⃣ **Security Testing**: Access **http://localhost:3000/security-test** to simulate authentication & configuration vulnerabilities (not deployed to production).  

---

## 🔒 Security Testing
This project follows **OWASP Top 10** security guidelines. A dedicated **test page (`page-security-test.tsx`)** is used for local testing, with detailed findings documented in ([**security_notes.md**](https://github.com/trio-habel-jonathan/solana-counter/blob/main/security-notes.md)).



### 🛑 Broken Authentication Test
- **Objective**: Test the DApp’s resistance to unauthorized or fake wallet addresses.
- **Findings**:
  - ✅ Blocks unregistered addresses effectively.
  - ❌ **Does not verify signatures**, allowing spoofing risks.
- **Recommendation**: Implement **signature verification** for wallet authentication.

### ⚠️ Security Misconfiguration Test
- **Objective**: Analyze incorrect network configurations.
- **Findings**:
  - ❌ **Allowed connections to mainnet & fake URLs** initially.
  - ✅ After enforcing **Devnet-only validation**, non-Devnet connections are blocked.
- **Recommendation**: Maintain **strict network validation** to prevent unauthorized access.

---

## 🤝 Contributing
Contributions are welcome! 🚀
1. **Fork** the repository.
2. Create a **new branch**: `git checkout -b feature-branch`.
3. **Commit changes**: `git commit -m "Description of changes"`.
4. **Push** to GitHub: `git push origin feature-branch`.
5. Open a **Pull Request**.

---

## 📜 License
This project is licensed under the **MIT License**. See the **LICENSE** file for details.

---

## 📧 Contact
👨‍💻 **Author:** Trio Habel Jonathan
📩 **Email:** habeljonathan.dev@gmail.com
🐙 **GitHub:** [Trio Habel Jonathan](https://github.com/trio-habel-jonathan)  
💼 **LinkedIn:** [Trio Habel Jonathan](https://www.linkedin.com/in/trio-habel-jonathan-573b49352)  

---

✨ *Built with passion for blockchain innovation!* 🚀

