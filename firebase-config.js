// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDl6x8zfUGWLfeq_Qy18z4Yqr0LaxoDtn4",
  authDomain: "sonisonsproject.firebaseapp.com",
  projectId: "sonisonsproject",
  storageBucket: "sonisonsproject.firebasestorage.app",
  messagingSenderId: "840589594908",
  appId: "1:840589594908:web:0a6a9192229eace9ce2ad9",
  measurementId: "G-YRHW7Y1F50"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Ensure Firebase Auth session exists so Firestore rules allow writes
export async function ensureFirebaseAuth() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
      console.log("Firebase anonymous session active.");
    } catch (e) {
      console.warn("Firebase Auth Notice:", e.message);
    }
  }
}

export async function fetchProductsViaRest() {
    try {
        const res = await fetch("https://firestore.googleapis.com/v1/projects/sonisonsproject/databases/(default)/documents/products?pageSize=300");
        const data = await res.json();
        if (data && data.documents && Array.isArray(data.documents)) {
            return data.documents.map(doc => {
                const id = doc.name.split('/').pop();
                const fields = doc.fields || {};
                const parsed = { id: isNaN(id) ? id : Number(id) };
                Object.keys(fields).forEach(key => {
                    const valObj = fields[key];
                    if (valObj.stringValue !== undefined) parsed[key] = valObj.stringValue;
                    else if (valObj.integerValue !== undefined) parsed[key] = Number(valObj.integerValue);
                    else if (valObj.doubleValue !== undefined) parsed[key] = Number(valObj.doubleValue);
                    else if (valObj.booleanValue !== undefined) parsed[key] = valObj.booleanValue;
                    else if (valObj.arrayValue !== undefined) parsed[key] = (valObj.arrayValue.values || []).map(v => v.stringValue || v);
                });
                return parsed;
            });
        }
    } catch (e) {
        console.error("REST fetch error:", e);
    }
    return [];
}

// Helper functions for our products
export async function getProductsFromFirebase() {
    // 1. Instant REST fetch (<150ms)
    const restProds = await fetchProductsViaRest();
    if (restProds && restProds.length > 0) {
        return restProds;
    }

    // 2. Fallback to SDK
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        if (products.length > 0) return products;
    } catch (e) {
        console.warn("Firestore SDK fetch notice: ", e);
    }

    return [];
}

export async function saveProductToFirebase(product) {
    try {
        const docRef = doc(db, "products", product.id.toString());
        await setDoc(docRef, product, { merge: true });
        console.log("Product saved successfully!");
    } catch (e) {
        console.error("Error saving product: ", e);
        throw e;
    }
}

export async function deleteProductFromFirebase(id) {
    try {
        const docRef = doc(db, "products", id.toString());
        await updateDoc(docRef, { isDeleted: true });
        console.log("Product soft-deleted successfully!");
    } catch (e) {
        console.error("Error deleting product: ", e);
        throw e;
    }
}

export async function updateProductStock(id, status) {
    try {
        const docRef = doc(db, "products", id.toString());
        await updateDoc(docRef, { inStock: status });
        console.log("Stock status updated!");
    } catch (e) {
        console.error("Error updating stock: ", e);
    }
}

export function listenForProducts(callback) {
    // 1. Immediately emit via REST fetch so data displays in <150ms
    fetchProductsViaRest().then(prods => {
        if (prods && prods.length > 0) {
            callback(prods);
        }
    }).catch(console.warn);

    // 2. Attach real-time onSnapshot listener
    try {
        const productsRef = collection(db, "products");
        return onSnapshot(productsRef, (querySnapshot) => {
            const products = [];
            querySnapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });
            if (products.length > 0) {
                callback(products);
            }
        }, async (error) => {
            console.warn("Snapshot listener fallback: ", error);
            const fallbackProds = await fetchProductsViaRest();
            if (fallbackProds && fallbackProds.length > 0) {
                callback(fallbackProds);
            }
        });
    } catch (snapErr) {
        console.warn("onSnapshot attach error:", snapErr);
    }
}

export async function saveCategoryOrderToFirebase(data) {
    try {
        const docRef = doc(db, "settings", "categoryOrder");
        const payload = Array.isArray(data) ? { order: data, updatedAt: Date.now() } : { ...data, updatedAt: Date.now() };
        await setDoc(docRef, payload, { merge: true });
        console.log("Category metadata saved successfully!");
    } catch (e) {
        console.error("Error saving category metadata: ", e);
        throw e;
    }
}

export function listenForCategoryOrder(callback) {
    // Immediate fallback fetch
    fetch("https://firestore.googleapis.com/v1/projects/sonisonsproject/databases/(default)/documents/settings/categoryOrder")
      .then(r => r.json())
      .then(data => {
        if (data && data.fields) {
          const rawOrder = data.fields.order?.arrayValue?.values?.map(v => v.stringValue) || [];
          const rawImages = {};
          if (data.fields.images?.mapValue?.fields) {
            Object.keys(data.fields.images.mapValue.fields).forEach(k => {
              rawImages[k] = data.fields.images.mapValue.fields[k]?.stringValue || '';
            });
          }
          callback({ order: rawOrder, images: rawImages });
        }
      }).catch(console.warn);

    const docRef = doc(db, "settings", "categoryOrder");
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback(data);
        } else {
            callback({ order: [], images: {} });
        }
    }, (error) => {
        console.warn("Category order listener warning: ", error);
    });
}

export { auth, db, storage, ref, uploadBytes, getDownloadURL };

