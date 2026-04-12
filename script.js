import { getProductsFromFirebase, initializeProducts, listenForProducts } from './firebase-config.js';

// Products Data - Initial state (Backup)
const initialProducts = [
  {
    id: 1,
    name: "Aloe Vera Handmade Soap",
    category: "Herbal & Natural",
    price: 99,
    oldPrice: 130,
    unit: "piece",
    image: "assets/images/aloevera-shop.jpg",
    offer: "24% OFF",
    desc: "Pure handcrafted aloe vera soap with natural extracts. Gently moisturizes, soothes skin irritation, and leaves your skin feeling fresh. Free from harmful chemicals — perfect for all skin types.",
    inStock: true
  },
  {
    id: 2,
    name: "Herbal Charcoal Aloe Vera Soap",
    category: "Herbal & Natural",
    price: 110,
    oldPrice: 149,
    unit: "piece",
    image: "assets/images/charcoal-soap.jpg",
    offer: "Best Seller",
    desc: "Deep-cleansing activated charcoal soap enriched with aloe vera. Draws out impurities and toxins from pores, controls excess oil, and gives a glowing, refreshed complexion. Ideal for oily and acne-prone skin.",
    inStock: true
  },
  {
    id: 3,
    name: "Herbal Shampoo & Conditioner",
    category: "Hair Care",
    price: 199,
    oldPrice: 260,
    unit: "combo pack",
    image: "assets/images/shampoo-conditioner.jpg",
    offer: "Combo Deal",
    desc: "A powerful herbal duo for strong, shiny, and healthy hair. Infused with natural botanical extracts, this shampoo and conditioner set nourishes roots, reduces hair fall, and adds incredible shine without harsh chemicals.",
    inStock: true
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  // Mobile Navigation
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('nav-active');
      const icon = menuBtn.querySelector('i');
      if (navLinks.classList.contains('nav-active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });
  }

  // Scroll Animations setup
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Initial products render / Real-time sync
  listenForProducts(async (products) => {
    // If no products in database, let's initialize it once with backup data
    if (products.length === 0) {
      console.log("No data in Firebase, initializing...");
      await initializeProducts(initialProducts);
      // The listener will re-fire soon with the new products
      return;
    }
    
    renderProductsUI(products);

    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  });

  // Navbar Background on Scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
});

function renderProductsUI(products) {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  let html = '';
  products.sort((a, b) => a.id - b.id).forEach(product => {
    const inStock = product.inStock !== false; // Default to true if undefined
    
    html += `
      <div class="product-card animate-on-scroll ${!inStock ? 'out-of-stock' : ''}">
        ${product.offer ? `<div class="product-badge">${product.offer}</div>` : ''}
        <div class="product-img-wrapper">
          <img src="${product.image}" alt="${product.name}" class="product-img" style="${!inStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
          ${!inStock ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-content">
          <span class="product-category">${product.category}</span>
          <h3 class="product-title" style="${!inStock ? 'color: var(--text-muted);' : ''}">${product.name}</h3>
          <p class="product-desc">${product.desc}</p>
          <div class="product-footer">
            <div class="product-price">
              ₹${product.price} / ${product.unit}
              ${product.oldPrice ? `<span class="old-price">₹${product.oldPrice}</span>` : ''}
            </div>
            <div class="stock-status-pill ${inStock ? 'in-stock' : 'no-stock'}">
              <i class="fa-solid ${inStock ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
              ${inStock ? 'In Stock' : 'Out of Stock'}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  productsContainer.innerHTML = html;
}



