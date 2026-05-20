# NoteCraft Frontend

A collaborative, offline-first note-taking app built with React 18, TypeScript, TailwindCSS, Redux Toolkit, TipTap, Yjs, and Socket.IO.

## Setup

### 1. Install dependencies

```bash
cd client
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend REST API base URL (e.g. `http://localhost:4000/api`) |
| `VITE_SOCKET_URL` | Socket.IO server URL (e.g. `http://localhost:4000`) |

Google OAuth is initiated through the backend at `/api/auth/google`; configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in the server environment.

### 3. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. Build for production

```bash
npm run build
```

## Tech Stack

- **React 18** + **TypeScript** (strict mode)
- **Vite 5** — build tool
- **TailwindCSS 3** — utility-first CSS with dark mode (`class` strategy)
- **Redux Toolkit** + **RTK Query** — state management and API calls
- **React Router v6** — client-side routing
- **TipTap** — rich text editor with Yjs collaboration
- **Yjs** + **y-prosemirror** — CRDT for real-time collaboration
- **Socket.IO Client 4** — real-time communication
- **Dexie.js** — IndexedDB for offline-first persistence
- **React Hook Form** + **Zod** — form validation
- **Lucide React** — icons
- **react-hot-toast** — toast notifications

## Project Structure

```
src/
  components/
    ui/           # Button, Input, Modal, Badge, Avatar, Spinner, Skeleton
    layout/       # Sidebar, TopNav, PageLayout, SplitPane
    auth/         # LoginForm, SignupForm, GoogleOAuthButton, AuthGuard
    workspace/    # WorkspaceList, WorkspaceCard, MembersModal
    folder/       # FolderTree, FolderNode, FolderContextMenu
    note/         # NoteCard, NoteList, AutoSaveIndicator
    editor/       # TipTapEditor, Toolbar, CollaboratorCursor, PresenceBar
    search/       # SearchModal, SearchResult, SearchEmpty
    sync/         # OfflineBanner, SyncStatus, ConflictModal
  pages/
    LoginPage.tsx
    SignupPage.tsx
    DashboardPage.tsx
    WorkspacePage.tsx
    NoteEditorPage.tsx
    SettingsPage.tsx
    NotFoundPage.tsx
  store/
    index.ts          # Store + typed hooks + selectors
    authSlice.ts
    workspaceSlice.ts
    folderSlice.ts
    noteSlice.ts
    uiSlice.ts
    api.ts            # RTK Query (18 endpoints)
  hooks/
    useDebounce.ts
    useAuth.ts
    useSocket.ts
    useOfflineSync.ts
    useCollaboration.ts
    useSearch.ts
  lib/
    db.ts             # Dexie.js IndexedDB
    socket.ts         # Socket.IO singleton
    yjs.ts            # Yjs doc manager
  types/
    index.ts
  utils/
    cn.ts
    formatDate.ts
    truncate.ts
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open search modal |
| `Cmd+S` | Force save note |
| `Cmd+B` | Bold text |
| `Cmd+I` | Italic text |
| `Cmd+\` | Toggle sidebar |
| `Esc` | Close modal |
