# 📱 Chat App — Mobile

Application mobile de messagerie temps réel développée avec **React Native et Expo**.

L'application permet aux utilisateurs de discuter dans différents salons avec une synchronisation instantanée des messages.

## ✨ Fonctionnalités

* 💬 Messagerie temps réel
* 🏠 Salons de discussion
* 📩 Envoi et réception instantanés
* 📜 Historique des conversations
* 👁️ Messages lus
* ⌨️ Indicateur de saisie
* ✏️ Modification des messages
* 👍 Réactions
* 🔄 Reconnexion automatique
* 🔐 Authentification
* 👤 Gestion du profil
* 📱 Interface mobile responsive

## 🛠️ Technologies

* React Native
* Expo
* Expo Router
* TypeScript
* Socket.IO Client
* React Context API

## 📂 Structure

```text
mobile/
├── app/
│   ├── (auth)/
│   ├── (tabs)/
│   ├── app/
│   └── _layout.tsx
│
├── components/
│   ├── Chat/
│   ├── Message/
│   ├── Room/
│   └── ...
│
├── context/
│   ├── AuthContext.tsx
│   ├── ChatContext.tsx
│   └── ...
│
├── hooks/
│   └── ...
│
├── services/
│   └── socket.ts
│
├── constants/
│   └── ...
│
├── assets/
│   └── ...
│
├── app.json
├── package.json
└── README.md
```

## 🚀 Installation

```bash
git clone <URL_DU_REPOSITORY>
cd mobile
npm install
```

## ⚙️ Configuration

Configurer l'adresse du backend dans les variables ou constantes de l'application.

Exemple :

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

> Pour un appareil physique, `localhost` doit généralement être remplacé par l'adresse IP locale de la machine exécutant le backend.

## ▶️ Lancer l'application

```bash
npm start
```

### Android

```bash
npm run android
```

ou :

```bash
npx expo run:android
```

### iOS

```bash
npm run ios
```

## 💬 Chat temps réel

La communication avec le backend utilise Socket.IO.

```text
Mobile
   │
   │ Socket.IO
   ▼
Backend
   │
   │ Socket.IO
   ▼
Web / autres mobiles
```

Lorsqu'un utilisateur reçoit un nouveau message, l'interface est mise à jour immédiatement.

## 🔌 Événements

Le client écoute notamment :

```text
previousRoomMessages
newRoomMessage
roomRead
messageEdited
reactions
typing
```

### `previousRoomMessages`

Charge les messages précédents d'un salon.

### `newRoomMessage`

Reçoit un nouveau message en temps réel.

### `roomRead`

Met à jour les informations de lecture.

### `messageEdited`

Synchronise les messages modifiés.

### `reactions`

Synchronise les réactions.

### `typing`

Affiche l'indicateur de saisie.

## 🔄 Reconnexion

Le client Socket.IO est configuré pour tenter automatiquement de se reconnecter lorsque la connexion est interrompue.

Cette fonctionnalité permet de conserver une expérience fluide lorsque le réseau devient momentanément indisponible.

## 🎨 Interface

L'application utilise une interface adaptée aux appareils mobiles avec notamment :

* liste des conversations
* liste des messages
* champ de saisie
* réactions
* indicateurs de lecture
* indicateur de saisie

## 🔐 Authentification

L'application communique avec le backend pour gérer la session utilisateur.

La session repose sur un cookie sécurisé fourni par le serveur.

## 🧪 Développement

```bash
npm run lint
```

Démarrer Expo :

```bash
npm start
```

## 📦 Build

Pour un build Android via Expo/EAS :

```bash
eas build --platform android
```

## 📄 Licence

Projet développé dans le cadre d'une application de messagerie temps réel.

---

### Stack

**React Native · Expo · Expo Router · TypeScript · Socket.IO Client**
