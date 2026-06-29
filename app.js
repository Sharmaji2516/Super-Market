import { listenForProducts } from './firebase-config.js?v=1.0.3';

let allProducts = []; // To store products for filtering

// Products Data - Initial state removed (Seeding disabled)

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
    
    
    // Filter out soft-deleted products
    const activeProducts = products.filter(p => p.isDeleted !== true);
    allProducts = activeProducts;
    
    // Populate categories dynamically
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      const categories = [...new Set(activeProducts.map(p => p.category).filter(Boolean))];
      categoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    renderProductsUI(activeProducts);

    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  });

  // Search Logic
  const searchInput = document.getElementById('productSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchHistoryList = document.getElementById('searchHistoryList'); // Revertible Feature

  const performSearch = () => {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    }

    const filtered = allProducts.filter(p => {
      const matchesName = p.name.toLowerCase().includes(searchTerm) || 
                          (p.desc && p.desc.toLowerCase().includes(searchTerm));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesName && matchesCategory;
    });
    
    renderProductsUI(filtered);
    
    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  };

  // --- Search History Logic (Revertible Feature) ---
  const MAX_HISTORY = 5;
  
  const getHistory = () => JSON.parse(localStorage.getItem('searchHistory') || '[]');
  
  const saveHistory = (term) => {
    if (!term) return;
    let history = getHistory();
    history = history.filter(item => item !== term); // Remove duplicate
    history.unshift(term); // Add to start
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
    
    // Add click events
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
      // Delay to allow clicking on history items
      setTimeout(() => {
        if (searchHistoryList) searchHistoryList.style.display = 'none';
      }, 200);
      
      // Save history on blur if not empty
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
