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
import { getAuth, signInAnonymously, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// --- ROLE-BASED ACCESS & APPROVAL WORKFLOW HELPERS ---

const SUPER_ADMIN_WHITELIST = [
  'lavsharma.it25@gmail.com',
  'chittortech@gmail.com',
  'business@chittortech.in',
  'admin@orient.com',
  'contact@chittortech.in'
];

const PRODUCT_ADMIN_WHITELIST = [
  'sonisupermarket@chittortech.in'
];

export async function getUserRole(uid, email) {
  const normEmail = (email || '').trim().toLowerCase();
  if (SUPER_ADMIN_WHITELIST.includes(normEmail)) {
    return 'super_admin';
  }

  // 1. Check in Managed Approval Admins Collection
  try {
    let appDocRef = doc(db, "approval_admins", normEmail);
    let appSnap = await getDoc(appDocRef);
    if (!appSnap.exists()) {
      const emailKey = normEmail.replace(/[@.]/g, '_');
      appDocRef = doc(db, "approval_admins", emailKey);
      appSnap = await getDoc(appDocRef);
    }
    if (appSnap.exists()) {
      const data = appSnap.data();
      if (data.isActive === false || data.status === 'disabled') {
        return 'disabled';
      }
      return 'approval_admin';
    }
  } catch (err) {
    console.warn("Could not check approval_admins:", err);
  }

  if (PRODUCT_ADMIN_WHITELIST.includes(normEmail)) {
    return 'product_admin';
  }

  try {
    // 2. Check by UID in admin_roles
    if (uid) {
      const uidRef = doc(db, "admin_roles", uid);
      const uidSnap = await getDoc(uidRef);
      if (uidSnap.exists() && uidSnap.data().role) {
        return uidSnap.data().role;
      }
    }

    // 3. Check by sanitized email key in admin_roles
    if (normEmail) {
      const emailKey = normEmail.replace(/[@.]/g, '_');
      const emailRef = doc(db, "admin_roles", emailKey);
      const emailSnap = await getDoc(emailRef);
      if (emailSnap.exists() && emailSnap.data().role) {
        return emailSnap.data().role;
      }
    }
  } catch (err) {
    console.warn("Could not fetch user role from Firestore:", err);
  }

  return null;
}

export async function setAdminUserRole(key, roleData) {
  try {
    const docRef = doc(db, "admin_roles", key);
    await setDoc(docRef, {
      ...roleData,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Failed to set user role:", err);
    throw err;
  }
}

export async function submitProductRequest(requestData) {
  try {
    const reqId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const docRef = doc(db, "product_requests", reqId);
    const payload = {
      id: reqId,
      status: 'pending',
      submittedAt: Date.now(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionRemarks: '',
      ...requestData
    };
    await setDoc(docRef, payload);
    return reqId;
  } catch (err) {
    console.error("Failed to submit product request:", err);
    throw err;
  }
}

export async function getProductRequestsFromFirebase() {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/sonisonsproject/databases/(default)/documents/product_requests?pageSize=100");
    const data = await res.json();
    if (data && data.documents && Array.isArray(data.documents)) {
      const parseField = (valObj) => {
        if (!valObj) return undefined;
        if (valObj.stringValue !== undefined) return valObj.stringValue;
        if (valObj.integerValue !== undefined) return Number(valObj.integerValue);
        if (valObj.doubleValue !== undefined) return Number(valObj.doubleValue);
        if (valObj.booleanValue !== undefined) return valObj.booleanValue;
        if (valObj.arrayValue !== undefined) return (valObj.arrayValue.values || []).map(v => parseField(v));
        if (valObj.mapValue !== undefined) {
          const m = {};
          const sub = valObj.mapValue.fields || {};
          Object.keys(sub).forEach(k => { m[k] = parseField(sub[k]); });
          return m;
        }
        return undefined;
      };

      const reqs = data.documents.map(doc => {
        const id = doc.name.split('/').pop();
        const fields = doc.fields || {};
        const parsed = { id };
        Object.keys(fields).forEach(k => { parsed[k] = parseField(fields[k]); });
        return parsed;
      });

      reqs.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      return reqs;
    }
  } catch (err) {
    console.warn("REST requests fetch notice:", err);
  }
  return [];
}

export function listenForProductRequests(callback) {
  // 1. Immediate REST fetch for instant (<150ms) loading
  getProductRequestsFromFirebase().then(reqs => {
    if (reqs && reqs.length > 0) {
      callback(reqs);
    }
  }).catch(console.warn);

  // 2. Real-time snapshot listener
  try {
    const reqsRef = collection(db, "product_requests");
    return onSnapshot(reqsRef, (snapshot) => {
      const requests = [];
      snapshot.forEach(docSnap => {
        requests.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first
      requests.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      callback(requests);
    }, async (error) => {
      console.warn("Product requests snapshot listener fallback:", error);
      const fallbackReqs = await getProductRequestsFromFirebase();
      if (fallbackReqs && fallbackReqs.length > 0) {
        callback(fallbackReqs);
      }
    });
  } catch (err) {
    console.error("Failed to attach requests listener:", err);
  }
}

export async function approveProductRequest(requestId, reviewerEmail, allExistingProducts = [], overrideProposedData = null) {
  try {
    const reqRef = doc(db, "product_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) {
      throw new Error("Request not found");
    }

    const reqData = reqSnap.data();
    if (reqData.status === 'approved') {
      throw new Error("This request is already approved.");
    }

    const proposed = overrideProposedData || reqData.proposedData || {};
    let productToSave = {};

    if (reqData.requestType === 'add') {
      let nextId = proposed.id;
      if (!nextId) {
        nextId = allExistingProducts.length > 0 
          ? (Math.max(...allExistingProducts.map(p => Number(p.id) || 0)) + 1) 
          : 101;
      }
      productToSave = {
        ...proposed,
        id: nextId,
        isDeleted: false
      };
      await saveProductToFirebase(productToSave);
    } else if (reqData.requestType === 'edit') {
      const targetId = reqData.targetProductId;
      if (!targetId) throw new Error("Target product ID missing in edit request");
      productToSave = {
        ...proposed,
        id: isNaN(targetId) ? targetId : Number(targetId),
        isDeleted: false
      };
      await saveProductToFirebase(productToSave);
    }

    // Mark request as approved with final reviewed data
    await updateDoc(reqRef, {
      status: 'approved',
      proposedData: productToSave,
      reviewedBy: reviewerEmail || 'Super Admin',
      reviewedAt: Date.now()
    });

    return true;
  } catch (err) {
    console.error("Approval error:", err);
    throw err;
  }
}

export async function rejectProductRequest(requestId, remarks, reviewerEmail) {
  try {
    const reqRef = doc(db, "product_requests", requestId);
    await updateDoc(reqRef, {
      status: 'rejected',
      rejectionRemarks: remarks || 'Rejected by Super Admin',
      reviewedBy: reviewerEmail || 'Super Admin',
      reviewedAt: Date.now()
    });
    return true;
  } catch (err) {
    console.error("Rejection error:", err);
    throw err;
  }
}

// ==========================================================================
// EMAIL-BASED ACCESS MANAGEMENT FOR PRODUCT APPROVAL
// ==========================================================================

export function sanitizeEmailKey(email) {
  return (email || '').trim().toLowerCase();
}

export async function getApprovalAdmins() {
  try {
    const qSnap = await getDocs(collection(db, "approval_admins"));
    const admins = [];
    qSnap.forEach(d => {
      admins.push({ id: d.id, ...d.data() });
    });
    admins.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return admins;
  } catch (e) {
    console.error("Failed to fetch approval admins:", e);
    return [];
  }
}

export function listenForApprovalAdmins(callback) {
  try {
    const colRef = collection(db, "approval_admins");
    return onSnapshot(colRef, (snapshot) => {
      const admins = [];
      snapshot.forEach(docSnap => {
        admins.push({ id: docSnap.id, ...docSnap.data() });
      });
      admins.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      callback(admins);
    }, (error) => {
      console.warn("approval_admins listener notice:", error);
    });
  } catch (err) {
    console.error("Failed to attach approval admins listener:", err);
  }
}

export async function saveApprovalAdmin(data) {
  try {
    const email = (data.email || '').trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    const docKey = sanitizeEmailKey(email);
    const docRef = doc(db, "approval_admins", docKey);
    
    const payload = {
      email: email,
      name: data.name || email.split('@')[0],
      role: 'approval_admin',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      updatedAt: Date.now(),
      notes: data.notes || '',
      passwordHint: data.passwordHint || '' // Optional label or hint for Super Admin reference
    };

    // If new, set createdAt
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      payload.createdAt = Date.now();
    }

    await setDoc(docRef, payload, { merge: true });
    return { success: true, docKey };
  } catch (err) {
    console.error("Failed to save approval admin:", err);
    throw err;
  }
}

export async function toggleApprovalAdminStatus(docKey, isActive) {
  try {
    const docRef = doc(db, "approval_admins", docKey);
    await updateDoc(docRef, {
      isActive: Boolean(isActive),
      status: isActive ? 'active' : 'disabled',
      updatedAt: Date.now()
    });
    return true;
  } catch (err) {
    console.error("Failed to toggle admin status:", err);
    throw err;
  }
}

export async function deleteApprovalAdmin(docKey) {
  try {
    const docRef = doc(db, "approval_admins", docKey);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error("Failed to delete approval admin:", err);
    throw err;
  }
}

// Live Session Guard: Listens to the current user's document in approval_admins.
// If the Super Admin turns them OFF, immediately triggers callback to log them out!
export function listenToUserStatus(email, onDisabledCallback) {
  if (!email) return null;
  const docKey = sanitizeEmailKey(email);
  const docRef = doc(db, "approval_admins", docKey);
  
  return onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      // Document was removed by Super Admin -> kill session
      onDisabledCallback("Your approval access account has been removed by the Super Admin.");
      return;
    }
    const data = docSnap.data();
    if (data.isActive === false || data.status === 'disabled') {
      // Account disabled by Super Admin -> kill session immediately
      onDisabledCallback("Your approval access has been turned OFF by the Super Admin.");
    }
  }, (err) => {
    console.warn("User status guard warning:", err);
  });
}

export async function sendAdminPasswordReset(email) {
  if (!email) throw new Error("Email is required");
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
}




