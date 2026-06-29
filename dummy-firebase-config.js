// DUMMY Firebase configuration for Client (No actual database connected)
const firebaseConfig = {
  apiKey: "FAKE_API_KEY_HIDDEN",
  authDomain: "fake-domain.firebaseapp.com",
  projectId: "fake-project-id",
  storageBucket: "fake-bucket.firebasestorage.app",
  messagingSenderId: "00000000000",
  appId: "1:000000000:web:abc123def456",
  measurementId: "G-FAKE123"
};

// Fake objects to prevent import errors in other files
const app = {};
const analytics = {};
const db = {};
const auth = {
    currentUser: null,
    signInWithEmailAndPassword: async () => { throw new Error("Database disconnected for privacy."); },
    signOut: async () => {}
};
const storage = {};

export async function getProductsFromFirebase() {
    console.log("Dummy: getProductsFromFirebase called");
    return [];
}

export async function saveProductToFirebase(product) {
    console.log("Dummy: Product saved (Not really, database disconnected)");
}

export async function deleteProductFromFirebase(id) {
    console.log("Dummy: Product deleted");
}

export async function updateProductStock(id, status) {
    console.log("Dummy: Stock updated");
}


// This is the most important function for script.js
// By returning an empty array, script.js will use its hardcoded initialProducts
export function listenForProducts(callback) {
    console.log("Dummy: listenForProducts called");
    callback([]); 
    return () => {}; // Return a fake unsubscribe function
}

// Export fake objects so admin.js / script.js don't crash
export const ref = () => {};
export const uploadBytes = async () => {};
export const getDownloadURL = async () => "fake_url";

export { auth, db, storage };
