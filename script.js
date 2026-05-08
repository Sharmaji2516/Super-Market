import { getProductsFromFirebase, initializeProducts, listenForProducts } from './firebase-config.js';

let allProducts = []; // To store products for filtering

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
  },
  {
    id: 4,
    name: "Chittor Marka Filtered Mustard Oil",
    category: "Cooking Essentials",
    price: 180,
    oldPrice: 210,
    unit: "1L Bottle",
    image: "assets/images/Chittor Marka Filtered Mustard Oil.jpeg",
    offer: "Fresh & Pure",
    desc: "Traditionally extracted filtered mustard oil from the heart of Chittorgarh. Perfect for healthy cooking with a strong aroma and authentic taste.",
    inStock: true
  },
  {
    id: 5,
    name: "Cold Drinks & Energy Drinks",
    category: "Beverages",
    price: 45,
    oldPrice: 50,
    unit: "bottle",
    image: "assets/images/Cold Drinks and Energy Drinks.jpeg",
    offer: "Cool Down",
    desc: "A wide variety of chilled soft drinks and energy drinks to keep you refreshed throughout the day. Perfect for parties and quick refreshments.",
    inStock: true
  },
  {
    id: 6,
    name: "Premium Deodorants & Perfumes",
    category: "Personal Care",
    price: 199,
    oldPrice: 299,
    unit: "piece",
    image: "assets/images/Deodrants and Perfumes.jpeg",
    offer: "Long Lasting",
    desc: "Stay fresh all day with our curated selection of premium deodorants and perfumes. Features a range of scents from floral to woody for both men and women.",
    inStock: true
  },
  {
    id: 7,
    name: "Eno Fruit Salt (3-in-1)",
    category: "Healthcare",
    price: 9,
    oldPrice: 10,
    unit: "sachet",
    image: "assets/images/Eno 3 in 1.jpeg",
    offer: "Quick Relief",
    desc: "Fast-acting Eno Fruit Salt for quick relief from acidity and bloating. The 3-in-1 formula works in seconds to help you feel comfortable again.",
    inStock: true
  },
  {
    id: 8,
    name: "Laxmi 2-Burner Gas Stove",
    category: "Kitchen Appliances",
    price: 1499,
    oldPrice: 1899,
    unit: "piece",
    image: "assets/images/Laxmi Gas Stove.jpeg",
    offer: "ISI Marked",
    desc: "Durable and efficient 2-burner gas stove from Laxmi. Features high-quality brass burners and a sturdy stainless steel body for long-lasting kitchen use.",
    inStock: true
  },
  {
    id: 9,
    name: "Modware Office Combo Set",
    category: "Home & Kitchen",
    price: 449,
    oldPrice: 599,
    unit: "set",
    image: "assets/images/Modware Office Kombo.jpeg",
    offer: "Combo Pack",
    desc: "Complete office lunch set from Modware. Includes leak-proof containers and an insulated bag to keep your meals fresh and warm for hours.",
    inStock: true
  },
  {
    id: 10,
    name: "Modware Insulated Water Jug",
    category: "Home & Kitchen",
    price: 349,
    oldPrice: 450,
    unit: "piece",
    image: "assets/images/Modware Water Jug .jpeg",
    offer: "Stay Hydrated",
    desc: "High-capacity insulated water jug designed to keep your beverages cold or hot for extended periods. Ideal for travel, office, or home use.",
    inStock: true
  },
  {
    id: 11,
    name: "Parle-G Gluco Biscuits",
    category: "Snacks & Biscuits",
    price: 25,
    oldPrice: 30,
    unit: "family pack",
    image: "assets/images/Parle-G Gluco Biscuit.jpeg",
    offer: "Energy Pack",
    desc: "The world's largest selling biscuit. Filled with the goodness of milk and wheat, Parle-G is the perfect companion for your morning tea.",
    inStock: true
  },
  {
    id: 12,
    name: "Premium Italian Pasta",
    category: "Snacks & Instant Food",
    price: 45,
    oldPrice: 60,
    unit: "pack",
    image: "assets/images/Pasta.jpeg",
    offer: "Easy Cook",
    desc: "Delicious and quick-to-cook pasta made from 100% durum wheat semolina. Perfect for a quick snack or a wholesome Italian dinner.",
    inStock: true
  },
  {
    id: 13,
    name: "Philips Citrus Juicer Iron",
    category: "Home Appliances",
    price: 799,
    oldPrice: 999,
    unit: "piece",
    image: "assets/images/Philips Citrus Iron.jpeg",
    offer: "Compact",
    desc: "Efficient Philips iron with a non-stick soleplate for smooth gliding. Compact design makes it easy to handle and store.",
    inStock: true
  },
  {
    id: 14,
    name: "Philips Classic Dry Iron",
    category: "Home Appliances",
    price: 1199,
    oldPrice: 1450,
    unit: "piece",
    image: "assets/images/Philips Classic Dry Iron.jpeg",
    offer: "Heavy Weight",
    desc: "Traditional heavy-weight dry iron from Philips for perfect creases. Features adjustable temperature control and a premium finished base.",
    inStock: true
  },
  {
    id: 15,
    name: "Saffola Masala Oats",
    category: "Breakfast & Cereals",
    price: 155,
    oldPrice: 180,
    unit: "pack",
    image: "assets/images/Saffola Classic Masala Oats.jpeg",
    offer: "Healthy Choice",
    desc: "A tasty and healthy breakfast option. Saffola Masala Oats are made with 100% whole grain oats and delicious real vegetables.",
    inStock: true
  },
  {
    id: 16,
    name: "Softy Premium Water Bottle",
    category: "Home & Kitchen",
    price: 99,
    oldPrice: 150,
    unit: "piece",
    image: "assets/images/Softy Water Bottle.jpeg",
    offer: "BPA Free",
    desc: "Stylish and durable BPA-free water bottle. Designed for everyday use with an easy-to-grip surface and leak-proof cap.",
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
    // Sync missing initial products to Firebase
    let updated = false;
    for (const ip of initialProducts) {
      if (!products.find(p => p.id == ip.id)) {
        console.log(`Product ${ip.name} (ID: ${ip.id}) missing from Firebase, initializing...`);
        await initializeProducts([ip]);
        updated = true;
      }
    }
    
    if (updated) return;
    
    allProducts = products;
    renderProductsUI(products);

    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  });

  // Search Logic
  const searchInput = document.getElementById('productSearch');
  const searchBtn = document.getElementById('searchBtn');

  const performSearch = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filtered = allProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm) || 
      (p.category && p.category.toLowerCase().includes(searchTerm)) ||
      (p.desc && p.desc.toLowerCase().includes(searchTerm))
    );
    renderProductsUI(filtered);
    
    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  };

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  // Navbar Background on Scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Contact Form Handling (WhatsApp Redirect)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      const email = document.getElementById('email').value;
      const message = document.getElementById('message').value;
      
      const whatsappNumber = "917014974762"; 
      const fullText = `*Name:* ${firstName} ${lastName}%0A*Message:* ${message}`;
      
      const waUrl = `https://wa.me/${whatsappNumber}?text=${fullText}`;
      window.open(waUrl, '_blank');
      
      contactForm.reset();
      alert('Thank you! Redirecting to WhatsApp...');
    });
  }
});

function renderProductsUI(products) {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  let html = '';
  // Sort by ID descending to show newest products first
  products.sort((a, b) => Number(b.id) - Number(a.id)).forEach(product => {
    const inStock = product.inStock !== false;
    
    html += `
      <div class="product-card animate-on-scroll ${!inStock ? 'out-of-stock' : ''}">
        <div class="product-img-wrapper">
          ${product.offer ? `<div class="product-badge">${product.offer}</div>` : ''}
          <img src="${product.image}" alt="${product.name}" class="product-img" style="${!inStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
          ${!inStock ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-content">
          <span class="product-category">${product.category}</span>
          <h3 class="product-title" style="${!inStock ? 'color: var(--text-muted);' : ''}">${product.name}</h3>
          <p class="product-desc">${product.desc}</p>
          <div class="product-footer">
            <div class="product-price">
              ₹${product.price}
              ${product.unit ? `<span>/ per ${product.unit}</span>` : ''}
            </div>
            <div class="stock-status-pill ${inStock ? 'in-stock' : 'no-stock'}">
              <i class="fa-solid ${inStock ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
              ${inStock ? 'In Stock' : 'No Stock'}
            </div>
          </div>
          ${product.videoLink ? `
            <a href="${product.videoLink}" target="_blank" class="product-external-link">
              <i class="fa-solid fa-play-circle"></i> Watch Product Video
            </a>
          ` : ''}
        </div>
      </div>
    `;
  });

  if (products.length === 0) {
    html = `
      <div class="no-results animate-on-scroll">
        <i class="fa-solid fa-box-open"></i>
        <h3>No products found</h3>
        <p>Try searching with a different name or category.</p>
      </div>
    `;
    productsContainer.style.display = 'block';
  } else {
    productsContainer.style.display = 'grid';
  }

  productsContainer.innerHTML = html;
}
