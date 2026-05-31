# Mehfil-e-Ghazal (Ghazalpaglu) - Retro Vinyl Ghazal Player

A beautifully designed, premium web application for exploring and listening to classic Ghazal music. Mehfil-e-Ghazal combines nostalgic vinyl record player aesthetics, warm dark-gold textures, and modern web tech to create an immersive, tactile listening experience for classical Urdu poetry and ghazal lovers.

---

## 🎨 Premium Aesthetics & UI

*   **Interactive Platter & Tonearm**: Click the golden arm to place the needle and play/pause the rotating vinyl record.
*   **Visualizer Rings**: Glow and pulse dynamically when music is playing.
*   **Tactile Wooden Shelf**: Browse artist vinyl collections stored in elegant wooden cubbies.
*   **Vibrant High-Contrast Interface**: Tailored typographic system using `Cinzel`, `Amiri`, and `Cormorant Garamond` fonts with large, legible high-contrast layouts.

---

## 🌟 Modern Features

### 1. Custom Playlist Management
*   **Stackable Action Controls**: Located at the bottom of the Playlists tab:
    *   **Add from Mehfil**: Opens a custom modal allowing you to choose/create a playlist and click tracks in the library to add them dynamically.
    *   **Add Custom Vinyl**: Take any YouTube link and add it as a custom vinyl track to your collection with auto-fetched song titles.
*   **Kebab Action Menus**: A sleek three-dots options dropdown (`⋮`) for each playlist:
    *   *Add from Mehfil* (toggles visual selection mode)
    *   *Rename Playlist* (renames inline)
    *   *Delete Playlist*
*   **Inline Renaming**: Change playlist titles in-place with inline inputs, green save checkmarks `✓`, and red close indicators `✕`—no distracting browser prompts.
*   **Custom Track Removal**: Remove individual tracks from a playlist instantly with the track minus `−` indicator.

### 2. Favorites List
*   Mark tracks as Favorites by clicking the heart button on vinyl record cards or within track rows.
*   Access your curated favorites in the dedicated **Favorites** tab in the right sidebar.

### 3. Share a Ghazal ("Gift of Melody")
*   Click **Send a Ghazal** to attach a personal note and generate a customized share URL.
*   Direct sharing integrations for WhatsApp, Twitter (X), Facebook, and Telegram.
*   Recipients opening shared links are greeted with an immersive retro parchment "Gift of Melody" modal containing your personal note, with one-click loading of the shared vinyl onto the platter.

---

## 🛠 Tech Stack

*   **Core**: React 19 + JavaScript ES6
*   **Build Tool**: Vite
*   **Styling**: Vanilla CSS (Premium HSL color palette + glassmorphism gradients)
*   **Audio Engine**: YouTube Iframe Player API integration
*   **Typography**: Google Fonts (`Amiri`, `Cinzel`, `Cormorant Garamond`)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Manha27/ghazalpaglu.git
    cd ghazalpaglu
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

The application will run locally at `http://localhost:5173/`.

### Available Scripts

*   `npm run dev` - Start the local dev server.
*   `npm run build` - Build the production-ready bundle.
*   `npm run lint` - Lint the codebase for errors.
*   `npm run preview` - Preview the built project locally.

---

## 📁 Project Structure

```
src/
├── components/           # React elements
│   ├── AmbientRoom.jsx  # Room ambiance overlay
│   ├── CDPlayer.jsx     # Controls panel
│   ├── CDRack.jsx       # Vinyl shelving display
│   ├── CustomVinylInput.jsx # Custom URL add form
│   ├── NeedleArm.jsx    # Animated stylus arm
│   └── NowPlaying.jsx   # Song details badge
├── data/
│   ├── ghazals.js       # Ghazal metadata
│   ├── lyrics.js        # Poet lyrics & translations
│   ├── playlist.js      # Core pre-loaded tracks
│   └── poetBios.js      # Biographies of historical poets
├── App.jsx              # Main App entry logic & states
├── main.jsx             # React DOM renderer
└── App.css / index.css  # Application styles & typography
```

---

## 📖 How to Listen

1.  Select the **Collection** tab and click any artist pack (cubby) to view their vinyl records.
2.  Click on a vinyl record to glide it onto the platter.
3.  Click the **Stylus/Tonearm** (or spacebar) to drop the needle and start playing.
4.  Switch to the **Playlists** tab to group your favorite songs together, customize, or share them.

---

Made with love for lovers of Urdu poetry, retro audio, and timeless melodies. 🎵
