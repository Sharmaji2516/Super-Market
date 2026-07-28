import { listenForProducts, listenForCategoryOrder } from './firebase-config.js?v=1.0.6';

let allProducts = []; // To store products for filtering
let activeCategory = 'all';
let categoryCustomOrder = []; // Custom category priority sequence set by Admin

// Helper to sort category names according to custom priority sequence (Case-Insensitive)
function sortCategoriesByCustomOrder(categoriesArray) {
  const orderUpper = (categoryCustomOrder || []).map(c => (c || '').toString().trim().toUpperCase());
  return [...categoriesArray].sort((a, b) => {
    const normA = (a || '').toString().trim().toUpperCase();
    const normB = (b || '').toString().trim().toUpperCase();

    const idxA = orderUpper.indexOf(normA);
    const idxB = orderUpper.indexOf(normB);

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Icon mapping helper for category pills
function getCategoryIcon(categoryName) {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('ice cream')) return 'fa-solid fa-ice-cream';
  if (name.includes('bread')) return 'fa-solid fa-bread-slice';
  if (name.includes('maggi') || name.includes('noodle')) return 'fa-solid fa-bowl-food';
  if (name.includes('chocolate')) return 'fa-solid fa-cookie-bite';
  if (name.includes('biscuit')) return 'fa-solid fa-cookie';
  if (name.includes('snack') || name.includes('chip')) return 'fa-solid fa-fire';
  if (name.includes('drink') || name.includes('beverage') || name.includes('juice')) return 'fa-solid fa-glass-water';
  if (name.includes('fruit') || name.includes('veg')) return 'fa-solid fa-carrot';
  return 'fa-solid fa-basket-shopping';
}

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

  // --- 1. INSTANT LOAD: Load cached products & category order from LocalStorage ---
  try {
    const cachedOrder = localStorage.getItem('cachedCategoryOrder');
    if (cachedOrder) {
      categoryCustomOrder = JSON.parse(cachedOrder);
    }
    const cachedData = localStorage.getItem('cachedProducts');
    if (cachedData) {
      const parsedProducts = JSON.parse(cachedData);
      if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
        allProducts = parsedProducts;
        populateCategoryDropdown(allProducts);
        renderCategoryPills(allProducts, activeCategory);
        renderProductsUI(allProducts);
      }
    }
  } catch (e) {
    console.warn("Local storage cache read error:", e);
  }

  // Listen for real-time Category Order from Firestore
  listenForCategoryOrder((savedOrder) => {
    categoryCustomOrder = savedOrder || [];
    try {
      localStorage.setItem('cachedCategoryOrder', JSON.stringify(categoryCustomOrder));
    } catch(e) {}
    populateCategoryDropdown(allProducts);
    renderCategoryPills(allProducts, activeCategory);
  });

  // --- 2. REAL-TIME SYNC: Listen for products from Firestore ---
  listenForProducts(async (products) => {
    // Filter out soft-deleted products
    const activeProducts = products.filter(p => p.isDeleted !== true);
    allProducts = activeProducts;
    
    // Save to LocalStorage for instant rendering on next page visit
    try {
      localStorage.setItem('cachedProducts', JSON.stringify(activeProducts));
    } catch (e) {
      console.warn("Local storage cache write error:", e);
    }
    
    populateCategoryDropdown(activeProducts);
    renderCategoryPills(activeProducts, activeCategory);
    performSearch();

    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  });

  // Search Logic
  const searchInput = document.getElementById('productSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchHistoryList = document.getElementById('searchHistoryList');

  function populateCategoryDropdown(products) {
    if (!categoryFilter) return;
    const rawCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const categories = sortCategoriesByCustomOrder(rawCategories);

    const currentVal = categoryFilter.value || 'all';
    categoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    categoryFilter.value = currentVal;
  }

  const performSearch = () => {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : activeCategory;
    activeCategory = selectedCategory;

    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    }

    const filtered = allProducts.filter(p => {
      const matchesName = p.name.toLowerCase().includes(searchTerm) || 
                          (p.desc && p.desc.toLowerCase().includes(searchTerm));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesName && matchesCategory;
    });
    
    renderCategoryPills(allProducts, selectedCategory);
    renderProductsUI(filtered);
    
    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  };

  // Dynamic Category Pills Renderer
  function renderCategoryPills(products, selectedCat) {
    const wrapper = document.getElementById('categoryPillsWrapper');
    const bar = document.getElementById('categoryPillsBar');
    if (!wrapper || !bar || !products || products.length === 0) return;

    // Count products per category
    const counts = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });

    const rawCategories = Object.keys(counts);
    const categories = sortCategoriesByCustomOrder(rawCategories);

    let pillsHTML = `
      <div class="category-pill ${selectedCat === 'all' ? 'active' : ''}" data-category="all">
        <div class="pill-icon-box">
          <i class="fa-solid fa-border-all"></i>
          <span class="pill-badge">${products.length}</span>
        </div>
        <span class="pill-title">All Categories</span>
      </div>
    `;

    categories.forEach(cat => {
      const count = counts[cat];
      const iconClass = getCategoryIcon(cat);
      const isActive = selectedCat === cat;
      pillsHTML += `
        <div class="category-pill ${isActive ? 'active' : ''}" data-category="${cat}">
          <div class="pill-icon-box">
            <i class="${iconClass}"></i>
            <span class="pill-badge">${count}</span>
          </div>
          <span class="pill-title">${cat}</span>
        </div>
      `;
    });

    bar.innerHTML = pillsHTML;
    wrapper.style.display = 'block';

    // Add click listeners to category pills
    bar.querySelectorAll('.category-pill').forEach(pill => {
      pill.onclick = () => {
        const cat = pill.getAttribute('data-category');
        activeCategory = cat;
        if (categoryFilter) categoryFilter.value = cat;
        performSearch();
      };
    });
  }

  // --- Search History Logic ---
  const MAX_HISTORY = 5;
  const getHistory = () => JSON.parse(localStorage.getItem('searchHistory') || '[]');
  
  const saveHistory = (term) => {
    if (!term) return;
    let history = getHistory();
    history = history.filter(item => item !== term);
    history.unshift(term);
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem('searchHistory', JSON.stringify(history));
    renderHistory();
  };

  const deleteHistoryItem = (term) => {
    let history = getHistory();
    history = history.filter(item => item !== term);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    renderHistory();
  };

  const renderHistory = () => {
    if (!searchHistoryList) return;
    const history = getHistory();
    if (history.length === 0) {
      searchHistoryList.style.display = 'none';
      return;
    }
    
    searchHistoryList.innerHTML = history.map(term => `
      <div class="search-history-item" data-term="${term}">
        <div class="search-history-text">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>${term}</span>
        </div>
        <i class="fa-solid fa-xmark search-history-delete" data-term="${term}"></i>
      </div>
    `).join('');
    
    searchHistoryList.querySelectorAll('.search-history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('search-history-delete')) {
          e.stopPropagation();
          deleteHistoryItem(e.target.dataset.term);
          return;
        }
        searchInput.value = item.dataset.term;
        performSearch();
        searchHistoryList.style.display = 'none';
      });
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', performSearch);
    
    searchInput.addEventListener('focus', () => {
      renderHistory();
      const history = getHistory();
      if (history.length > 0) {
        searchHistoryList.style.display = 'block';
      }
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (searchHistoryList) searchHistoryList.style.display = 'none';
      }, 200);
      
      const term = searchInput.value.trim();
      if (term.length >= 2) {
        saveHistory(term);
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const term = searchInput.value.trim();
        if (term.length >= 2) {
          saveHistory(term);
        }
        searchInput.blur();
      }
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', performSearch);
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      performSearch();
    });
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
          <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" style="${!inStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
          ${!inStock ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-content">
          <span class="product-category">${product.category}</span>
          <h3 class="product-title" style="${!inStock ? 'color: var(--text-muted);' : ''}">${product.name}</h3>
          <p class="product-desc">${product.desc || ''}</p>
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

