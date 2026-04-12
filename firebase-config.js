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
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Helper functions for our products
export async function getProductsFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // If no products in Firebase, we can initialize it with the local data once
        if (products.length === 0) {
            return null; 
        }
        return products;
    } catch (e) {
        console.error("Error fetching products: ", e);
        return null;
    }
}

export async function saveProductToFirebase(product) {
    try {
        // Use setDoc with Merge to update existing or create new
        const docRef = doc(db, "products", product.id.toString());
        await setDoc(docRef, product, { merge: true });
        console.log("Product saved successfully!");
    } catch (e) {
        console.error("Error saving product: ", e);
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

export async function initializeProducts(initialData) {
    for (const p of initialData) {
        const docRef = doc(db, "products", p.id.toString());
        // Add inStock field if not present
        if (p.inStock === undefined) p.inStock = true;
        await setDoc(docRef, p);
    }
}

export function listenForProducts(callback) {
    const productsRef = collection(db, "products");
    return onSnapshot(productsRef, (querySnapshot) => {
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        callback(products);
    }, (error) => {
        console.error("Error with snapshot listener: ", error);
    });
}
