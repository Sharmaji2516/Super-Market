import { listenForProducts } from './firebase-config.js?v=1.0.3';

let allProducts = []; // To store products for filtering

const categoryIcons = {
  "all": "fa-solid fa-border-all",
  "chocolates": "fa-solid fa-cookie-bite",
  "chocolate": "fa-solid fa-cookie-bite",
  "beverages": "fa-solid fa-glass-water",
  "drinks": "fa-solid fa-glass-water",
  "snacks & biscuits": "fa-solid fa-cookie",
  "snacks": "fa-solid fa-cookie",
  "personal care": "fa-solid fa-pump-soap",
  "maggi": "fa-solid fa-bowl-food",
  "noodles": "fa-solid fa-bowl-food",
  "bread": "fa-solid fa-bread-slice",
  "bakery": "fa-solid fa-bread-slice",
  "ice cream": "fa-solid fa-ice-cream",
  "groceries": "fa-solid fa-basket-shopping",
  "grocery": "fa-solid fa-basket-shopping"
};

const gradients = [
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // emerald
  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // indigo
  'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', // rose
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', // amber
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', // purple
  'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)'  // sky
];

const getGradientForCategory = (name) => {
  if (name === 'all') return 'linear-gradient(135deg, #059669 0%, #34d399 100%)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

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
      const prevValue = categoryFilter.value || 'all';
      const categories = [...new Set(activeProducts.map(p => p.category).filter(Boolean))];
      categoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
      
      // Restore previous value if still valid
      if (prevValue === 'all' || categories.includes(prevValue)) {
        categoryFilter.value = prevValue;
      } else {
        categoryFilter.value = 'all';
      }

      // Calculate product counts per category
      const categoryCounts = {};
      activeProducts.forEach(p => {
        if (p.category) {
          categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        }
      });

      // Render dynamic visual category filter panel
      const categoryScrollWrapper = document.getElementById('category-scroll-wrapper');
      if (categoryScrollWrapper) {
        let categoryList = ['all', ...categories];
        
        categoryScrollWrapper.innerHTML = categoryList.map(cat => {
          const catLower = cat.toLowerCase().trim();
          const gradient = getGradientForCategory(catLower);
          
          let innerContent = '';
          const iconClass = categoryIcons[catLower];
          if (iconClass) {
            innerContent = `<i class="${iconClass}"></i>`;
          } else {
            // First 2 letters or first letter of the category name
            innerContent = cat.charAt(0).toUpperCase();
          }

          const label = cat === 'all' ? 'All Categories' : cat;
          const isActive = categoryFilter.value === cat;
          const count = cat === 'all' ? activeProducts.length : (categoryCounts[cat] || 0);
          
          return `
            <div class="category-card ${isActive ? 'active' : ''}" data-category="${cat}">
              <div class="category-img-wrapper" style="background: ${gradient};">
                ${innerContent}
                <span class="category-count-badge">${count}</span>
              </div>
              <span class="category-name">${label}</span>
            </div>
          `;
        }).join('');

        // Attach click events
        categoryScrollWrapper.querySelectorAll('.category-card').forEach(card => {
          card.addEventListener('click', () => {
            const selectedCat = card.dataset.category;
            
            // Update active state in UI
            categoryScrollWrapper.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Update select dropdown value and trigger search
            categoryFilter.value = selectedCat;
            performSearch();
          });
        });
      }
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
    categoryFilter.addEventListener('change', () => {
      performSearch();
      // Sync visual category cards active state
      const categoryScrollWrapper = document.getElementById('category-scroll-wrapper');
      if (categoryScrollWrapper) {
        categoryScrollWrapper.querySelectorAll('.category-card').forEach(card => {
          if (card.dataset.category === categoryFilter.value) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        });
      }
    });
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
