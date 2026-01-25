// Re-export from config/firebase to ensure single Firebase app instance
// This prevents duplicate Firebase initialization issues
export { auth, db, app, storage } from "config/firebase";
