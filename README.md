# 🖥️ Logiciel SSH RDP

## 🚀 Objectif du projet

**Logiciel SSH RDP** est une application multiplateforme (Windows, macOS, Linux) permettant aux administrateurs système et ingénieurs réseau de **centraliser toutes leurs connexions distantes** (SSH, SFTP, RDP, etc.) dans une interface **moderne, fluide et sécurisée**.

Inspiré de mRemoteNG et Tabby, ce projet vise à offrir une **expérience utilisateur simple**, une **exécution native performante**, et une **interface moderne** grâce à Rust + React.

---

## ⚙️ Stack technique

| Côté                  | Technologie                              | Description                                                  |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| **Backend**           | [Rust](https://www.rust-lang.org/)       | Langage principal pour la performance et la sécurité mémoire |
| **Bridge / Shell**    | [Tauri](https://tauri.app/)              | Wrapper léger pour interface web + backend Rust              |
| **Frontend**          | [React + TypeScript](https://react.dev/) | Interface utilisateur moderne et réactive                    |
| **UI/UX**             | [TailwindCSS](https://tailwindcss.com/)  | Design system léger et modulable                             |
| **Terminal**          | [xterm.js](https://xtermjs.org/)         | Terminal interactif pour les sessions SSH                    |
| **Libs SSH/SFTP/RDP** | `ssh2`, `rdp-rs`, `tokio`, `serde`       | Gestion des connexions et de la sérialisation                |
| **Sécurité**          | `ring` / `age`                           | Chiffrement local des credentials                            |

---

## 🧱 Structure du projet

project-root/
├─ src-tauri/ → Code Rust (backend)
│ ├─ main.rs
│ ├─ commands/ → Modules Rust (ssh.rs, sftp.rs, rdp.rs, config.rs)
│ ├─ models/
│ ├─ storage/
│ └─ Cargo.toml
│
└─ src/ → Code React (frontend)
├─ components/
├─ pages/
├─ hooks/
├─ context/
├─ styles/
└─ main.tsx

---

## 🧩 Fonctionnalités MVP

### ✅ MVP 1 – SSH & SFTP

- Connexion SSH (exécution de commandes)
- Terminal intégré (xterm.js)
- Gestion basique du SFTP (listage / upload / download)
- Sauvegarde et chargement des connexions (fichier `config.json`)
- Chiffrement local des credentials

### 🧠 À venir

- RDP (intégré via wrapper FreeRDP)
- Multi-onglets / multi-sessions
- Thèmes clair/sombre
- Gestionnaire de connexions avancé
- Synchronisation cloud des connexions

---

## 🧰 Installation & Lancement

### 🪶 Prérequis

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) ou `npm`

### 🔧 Installation

```bash
# Cloner le dépôt
git clone https://github.com/<ton-org-ou-user>/logiciel-ssh-rdp.git
cd logiciel-ssh-rdp

# Installer les dépendances
pnpm install
cd src-tauri
cargo build
cd ..

# Lancer le projet
pnpm tauri dev

🧠 Principes de développement
🧩 Clean Code

Fonctions courtes, pures et nommées clairement

Nomenclature :

snake_case en Rust

camelCase en TypeScript

Commentaires uniquement pour expliquer les intentions, pas les évidences

Architecture modulaire : commands, models, storage, ui

🧩 Clean Commit

Convention :

<type>(scope): <message court>


Types valides :

feat: nouvelle fonctionnalité

fix: correction de bug

refactor: refactorisation sans changement de comportement

style: modifications visuelles

docs: documentation

test: ajout ou correction de tests

build: configuration / pipeline

Exemples :

feat(ssh): add SSH connection command
fix(ui): resolve layout overflow in sidebar
docs(readme): update installation instructions

🔁 Workflow GitHub

Main branch : main

Branches de travail : feature/<nom>, fix/<nom>

Commits fréquents et clairs

PR systématique vers main avec review

Exemple :

git checkout -b feature/ssh-module
# ... développement ...
git add .
git commit -m "feat(ssh): implement SSH command execution"
git push origin feature/ssh-module

🔐 Sécurité & stockage

Les credentials sont chiffrés localement avant stockage.

Aucune donnée sensible n’est envoyée à un service tiers.

Stockage local via serde_json ou sled.

Futur : intégration avec gestionnaires de clés système (Keychain / Credential Locker).

🧑‍💻 Contribution

Claude est responsable du développement technique initial.
Les contributions doivent :

Respecter les principes CleanCode et CleanCommit.

Être testées avant push.

Inclure une description claire dans le commit ou la PR.

📦 Build de production
pnpm tauri build


Les builds seront générés pour :

Windows (.exe)

macOS (.dmg)

Linux (.AppImage / .deb)

🗺️ Roadmap (résumé)
Phase	Objectif principal
1. Setup	Structure du projet (Rust + React + Tauri)
2. Configs	Gestion des profils de connexions
3. SSH/SFTP	Connexions, terminal et transferts
4. UI/UX	Interface moderne et thème clair/sombre
5. RDP	Wrapper de connexion RDP
6. Sécurité	Chiffrement des credentials
7. Release	Build cross-platform + bêta test

```
