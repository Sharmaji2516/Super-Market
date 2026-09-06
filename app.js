import { listenForProducts, listenForCategoryOrder } from './firebase-config.js?v=1.1.0';

let allProducts = []; // To store products for filtering
let activeCategory = localStorage.getItem('redirectCategory') || 'all';
localStorage.removeItem('redirectCategory');
let activeSubCategory = 'all';
let activeQuickFilters = new Set();
let categoryCustomOrder = []; // Custom category priority sequence set by Admin
let categoryCustomImages = {};

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

// Icon mapping helper for category and subcategory pills
function getCategoryIcon(nameInput) {
  const name = (nameInput || '').toLowerCase();
  if (name.includes('ice cream')) return 'fa-solid fa-ice-cream';
  if (name.includes('bread')) return 'fa-solid fa-bread-slice';
  if (name.includes('maggi') || name.includes('noodle') || name.includes('pasta')) return 'fa-solid fa-bowl-food';
  if (name.includes('chocolate')) return 'fa-solid fa-cookie-bite';
  if (name.includes('biscuit') || name.includes('cookie')) return 'fa-solid fa-cookie';
  if (name.includes('snack') || name.includes('chip') || name.includes('namkeen')) return 'fa-solid fa-fire';
  if (name.includes('drink') || name.includes('beverage') || name.includes('juice') || name.includes('cold')) return 'fa-solid fa-glass-water';
  if (name.includes('fruit') || name.includes('veg')) return 'fa-solid fa-carrot';
  if (name.includes('milk') || name.includes('dairy') || name.includes('paneer') || name.includes('curd')) return 'fa-solid fa-cow';
  if (name.includes('atta') || name.includes('flour') || name.includes('rice') || name.includes('grain')) return 'fa-solid fa-wheat-awn';
  if (name.includes('oil') || name.includes('ghee')) return 'fa-solid fa-droplet';
  if (name.includes('masala') || name.includes('spice')) return 'fa-solid fa-pepper-hot';
  if (name.includes('tea') || name.includes('coffee')) return 'fa-solid fa-mug-hot';
  if (name.includes('clean') || name.includes('wash') || name.includes('soap') || name.includes('detergent')) return 'fa-solid fa-soap';
  if (name.includes('shampoo') || name.includes('personal') || name.includes('cream')) return 'fa-solid fa-pump-soap';
  return 'fa-solid fa-basket-shopping';
}

function resolveDirectImageUrl(url) {
  if (!url) return '';
  let trimmed = url.trim();
  
  // 1. If string contains direct image URL
  const directMatch = trimmed.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)/i);
  if (directMatch) {
    return directMatch[0];
  }

  // 2. Auto-convert FreeImage.host viewer page link to direct image URL
  const freeimageMatch = trimmed.match(/freeimage\.host\/i\/([a-zA-Z0-9]+)/i);
  if (freeimageMatch && freeimageMatch[1]) {
    return `https://iili.io/${freeimageMatch[1]}.jpg`;
  }
  return trimmed;
}

// Dynamic Home Categories Renderer
function renderHomeCategories(products) {
  const homeGrid = document.getElementById('home-categories-grid');
  if (!homeGrid || !products || products.length === 0) return;

  const counts = {};
  products.forEach(p => {
    if (p.category) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
  });

  const rawCategories = Object.keys(counts);
  const categories = sortCategoriesByCustomOrder(rawCategories);

  let html = '';
  const bgColors = ['#dcfce7', '#e0f2fe', '#fef3c7', '#fce7f3', '#f1f5f9'];
  const textColors = ['#166534', '#075985', '#92400e', '#9d174d', '#475569'];

  categories.forEach((cat, index) => {
    const iconClass = getCategoryIcon(cat);
    const rawImg = categoryCustomImages[cat] || categoryCustomImages[cat.toUpperCase()] || categoryCustomImages[cat.toLowerCase()];
    const customImg = resolveDirectImageUrl(rawImg);

    const innerContent = customImg 
      ? `<img src="${customImg}" alt="${cat}" class="home-cat-thumb">` 
      : `<i class="${iconClass}"></i>`;

    const idx = index % bgColors.length;

    html += `
      <a href="products.html" onclick="localStorage.setItem('redirectCategory', '${cat}')" class="home-cat-card" title="${cat}">
        <div class="home-cat-img-box" style="background: ${bgColors[idx]}; color: ${textColors[idx]};">
          ${innerContent}
        </div>
        <span class="home-cat-label">${cat}</span>
      </a>
    `;
  });

  homeGrid.innerHTML = html;
}

// 1. Tier 1: Main Category Visual Strip Renderer (Always Visible with All Categories)
function renderCategoryPills(products, currentCategory) {
  const container = document.getElementById('categoryPillsContainer');
  const label = document.getElementById('allCategoriesStripLabel');
  if (!container || !products) return;

  const rawCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const categories = sortCategoriesByCustomOrder(rawCategories);

  if (label) {
    label.innerHTML = `All Categories (${categories.length})`;
  }

  let html = '';

  // "All" Pill
  const isAllActive = currentCategory === 'all';
  html += `
    <div class="subcat-pill ${isAllActive ? 'active' : ''}" data-cat="all">
      <div class="subcat-img-box">
        <i class="fa-solid fa-border-all"></i>
      </div>
      <span>All</span>
    </div>
  `;

  // Category Pills
  categories.forEach(cat => {
    const isActive = currentCategory.toLowerCase() === cat.toLowerCase();
    const iconClass = getCategoryIcon(cat);
    const prodWithImg = products.find(p => p.category === cat && p.image);
    const catImg = categoryCustomImages[cat] || (prodWithImg ? prodWithImg.image : '');
    const resolvedImg = resolveDirectImageUrl(catImg);

    const innerImg = resolvedImg 
      ? `<img src="${resolvedImg}" alt="${cat}" loading="lazy">` 
      : `<i class="${iconClass}"></i>`;

    html += `
      <div class="subcat-pill ${isActive ? 'active' : ''}" data-cat="${cat}">
        <div class="subcat-img-box">
          ${innerImg}
        </div>
        <span title="${cat}">${cat}</span>
      </div>
    `;
  });

  container.innerHTML = html;

  // Add click listeners to category pills
  container.querySelectorAll('.subcat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const selected = pill.getAttribute('data-cat');
      if (selected === 'all') {
        activeCategory = 'all';
      } else {
        activeCategory = (activeCategory === selected) ? 'all' : selected;
      }
      activeSubCategory = 'all';

      // Sync radio in sidebar
      const radio = document.querySelector(`input[name="categoryFilterRadio"][value="${activeCategory}"]`);
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('#sidebarCategoryList .filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
        radio.closest('.filter-radio-label')?.classList.add('active-filter');
      }

      renderCategoryPills(allProducts, activeCategory);
      renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
      renderSidebarFilters(allProducts, activeCategory);
      performSearch();
    });
  });
}

// 2. Tier 2: Dedicated Subcategories Strip Renderer (Appears below Tier 1 when a Category is selected)
function renderSubCategoryPills(products, currentCategory, currentSubCategory) {
  const section = document.getElementById('subCategoryStripSection');
  const container = document.getElementById('subcategoryPillsContainer');
  const catLabel = document.getElementById('currentCatLabel');
  const clearSubcatBtn = document.getElementById('clearSubcatBtn');
  if (!section || !container || !products) return;

  // If "all" categories is active, hide Tier 2 subcategories strip
  if (currentCategory === 'all') {
    section.style.display = 'none';
    return;
  }

  // Filter products relevant to current category
  const relevantProducts = products.filter(p => p.category === currentCategory);

  // Collect distinct subcategories
  const subCatMap = new Map(); // subcategory name -> sample image / icon
  relevantProducts.forEach(p => {
    const sub = p.subCategory || p.sub_category || p.subCat;
    if (sub && sub.trim()) {
      const cleanSub = sub.trim();
      if (!subCatMap.has(cleanSub)) {
        subCatMap.set(cleanSub, p.image || '');
      }
    }
  });

  // If no subcategories exist under this category, hide Tier 2 strip
  if (subCatMap.size === 0) {
    section.style.display = 'none';
    return;
  }

  // Show Tier 2 strip
  section.style.display = 'block';

  if (catLabel) {
    catLabel.innerHTML = `<span class="subcat-badge-title"><i class="fa-solid fa-shapes"></i> ${currentCategory} Subcategories <span class="subcat-count-pill">${subCatMap.size}</span></span>`;
  }

  let html = '';

  // "All" in this Category Pill
  const isAllActive = currentSubCategory === 'all';
  html += `
    <div class="subcat-pill ${isAllActive ? 'active' : ''}" data-subcat="all">
      <div class="subcat-img-box">
        <i class="fa-solid fa-list-check"></i>
      </div>
      <span>All in ${currentCategory}</span>
    </div>
  `;

  // Subcategory Pills
  subCatMap.forEach((imgUrl, subName) => {
    const isActive = currentSubCategory.toLowerCase() === subName.toLowerCase();
    const iconClass = getCategoryIcon(subName);
    const resolvedImg = resolveDirectImageUrl(imgUrl);

    const innerImg = resolvedImg 
      ? `<img src="${resolvedImg}" alt="${subName}" loading="lazy">` 
      : `<i class="${iconClass}"></i>`;

    html += `
      <div class="subcat-pill ${isActive ? 'active' : ''}" data-subcat="${subName}">
        <div class="subcat-img-box">
          ${innerImg}
        </div>
        <span title="${subName}">${subName}</span>
      </div>
    `;
  });

  container.innerHTML = html;

  // Add click listeners to subcategory pills
  container.querySelectorAll('.subcat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const selected = pill.getAttribute('data-subcat');
      if (selected === 'all') {
        activeSubCategory = 'all';
      } else {
        activeSubCategory = (activeSubCategory === selected) ? 'all' : selected;
      }
      renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
      performSearch();
    });
  });

  if (clearSubcatBtn) {
    clearSubcatBtn.onclick = () => {
      activeSubCategory = 'all';
      renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
      performSearch();
    };
  }
}

// Dynamic Sidebar Category Renderer
function renderSidebarFilters(products, selectedCat) {
  const list = document.getElementById('sidebarCategoryList');
  if (!list || !products || products.length === 0) return;

  // Count products per category
  const counts = {};
  products.forEach(p => {
    if (p.category) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
  });

  const rawCategories = Object.keys(counts);
  const categories = sortCategoriesByCustomOrder(rawCategories);

  let html = `
    <label class="filter-radio-label ${selectedCat === 'all' ? 'active-filter' : ''}">
      <input type="radio" name="categoryFilterRadio" value="all" ${selectedCat === 'all' ? 'checked' : ''}>
      <span class="radio-custom"></span>
      <span class="filter-name">All Categories</span>
      <span class="filter-count">${products.length}</span>
    </label>
  `;

  categories.forEach(cat => {
    const count = counts[cat];
    const isActive = selectedCat === cat;

    html += `
      <label class="filter-radio-label ${isActive ? 'active-filter' : ''}">
        <input type="radio" name="categoryFilterRadio" value="${cat}" ${isActive ? 'checked' : ''}>
        <span class="radio-custom"></span>
        <span class="filter-name">${cat}</span>
        <span class="filter-count">${count}</span>
      </label>
    `;
  });

  list.innerHTML = html;

  // Attach listeners to newly rendered radios
  list.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      list.querySelectorAll('.filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
      if (radio.closest('.filter-radio-label')) {
        radio.closest('.filter-radio-label').classList.add('active-filter');
      }
      activeCategory = radio.value;
      activeSubCategory = 'all'; // reset subcategory on category switch
      renderCategoryPills(allProducts, activeCategory);
      renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
      performSearch();
    });
  });
}

function updateActiveFilterBadges() {
  const badge = document.getElementById('activeFilterBadge');
  const tagsBar = document.getElementById('activeFilterTagsBar');
  const tagsContainer = document.getElementById('activeFilterChipsContainer');

  let activeCount = 0;
  let tagElements = [];

  if (activeCategory !== 'all') {
    activeCount++;
    tagElements.push(`<span class="filter-tag-chip">Category: ${activeCategory} <i class="fa-solid fa-xmark remove-cat-filter"></i></span>`);
  }

  if (activeSubCategory !== 'all') {
    activeCount++;
    tagElements.push(`<span class="filter-tag-chip">Subcategory: ${activeSubCategory} <i class="fa-solid fa-xmark remove-subcat-filter"></i></span>`);
  }

  const selectedPriceRadio = document.querySelector('input[name="priceFilter"]:checked');
  if (selectedPriceRadio && selectedPriceRadio.value !== 'all') {
    activeCount++;
    const priceText = selectedPriceRadio.closest('.filter-radio-label')?.querySelector('.filter-name')?.textContent || 'Price Filter';
    tagElements.push(`<span class="filter-tag-chip">${priceText} <i class="fa-solid fa-xmark remove-price-filter"></i></span>`);
  }

  activeQuickFilters.forEach(qf => {
    activeCount++;
    let label = qf;
    if (qf === 'in-stock') label = 'In Stock';
    if (qf === 'out-of-stock') label = 'Out of Stock';
    if (qf === 'discount') label = 'Offers';
    if (qf === 'under-100') label = '< ₹100';
    if (qf === '100-500') label = '₹100-₹500';
    tagElements.push(`<span class="filter-tag-chip">${label} <i class="fa-solid fa-xmark remove-quick-filter" data-qf="${qf}"></i></span>`);
  });

  if (badge) {
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
  }

  if (tagsBar && tagsContainer) {
    if (activeCount > 0) {
      tagsContainer.innerHTML = tagElements.join('');
      tagsBar.style.display = 'flex';

      // Attach tag removal events
      tagsBar.querySelectorAll('.remove-cat-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCategory = 'all';
          activeSubCategory = 'all';
          renderSidebarFilters(allProducts, activeCategory);
          renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
          performSearch();
        });
      });

      tagsBar.querySelectorAll('.remove-subcat-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          activeSubCategory = 'all';
          renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
          performSearch();
        });
      });

      tagsBar.querySelectorAll('.remove-price-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          const allPriceRadio = document.querySelector('input[name="priceFilter"][value="all"]');
          if (allPriceRadio) {
            allPriceRadio.checked = true;
            document.querySelectorAll('#sidebarPriceList .filter-radio-label').forEach(l => l.classList.remove('active-filter'));
            allPriceRadio.closest('.filter-radio-label')?.classList.add('active-filter');
          }
          performSearch();
        });
      });

      tagsBar.querySelectorAll('.remove-quick-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          const qf = btn.getAttribute('data-qf');
          activeQuickFilters.delete(qf);
          document.querySelectorAll(`.quick-chip-btn[data-filter="${qf}"]`).forEach(c => c.classList.remove('active'));
          performSearch();
        });
      });
    } else {
      tagsBar.style.display = 'none';
    }
  }
}

function performSearch() {
  const searchInput = document.getElementById('productSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Find selected category radio
  const selectedCategoryRadio = document.querySelector('input[name="categoryFilterRadio"]:checked');
  const selectedCategory = selectedCategoryRadio ? selectedCategoryRadio.value : (activeCategory || 'all');
  
  // Find selected price radio
  const selectedPriceRadio = document.querySelector('input[name="priceFilter"]:checked');
  const selectedPrice = selectedPriceRadio ? selectedPriceRadio.value : 'all';

  activeCategory = selectedCategory;

  if (clearSearchBtn) {
    clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
  }

  const filtered = allProducts.filter(p => {
    // 1. Name match
    const matchesName = !searchTerm || 
                        p.name.toLowerCase().includes(searchTerm) || 
                        (p.brand && p.brand.toLowerCase().includes(searchTerm)) ||
                        (p.desc && p.desc.toLowerCase().includes(searchTerm)) ||
                        (p.category && p.category.toLowerCase().includes(searchTerm)) ||
                        ((p.subCategory || p.sub_category) && (p.subCategory || p.sub_category).toLowerCase().includes(searchTerm));
    
    // 2. Category match
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    
    // 3. SubCategory match
    let matchesSubCategory = true;
    if (activeSubCategory !== 'all') {
      const prodSub = (p.subCategory || p.sub_category || p.category || '').toLowerCase();
      matchesSubCategory = prodSub === activeSubCategory.toLowerCase();
    }

    // 4. Price match
    let matchesPrice = true;
    const price = Number(p.price || 0);
    if (selectedPrice === '0-50') matchesPrice = price < 50;
    else if (selectedPrice === '50-200') matchesPrice = price >= 50 && price <= 200;
    else if (selectedPrice === '200-500') matchesPrice = price >= 200 && price <= 500;
    else if (selectedPrice === '500-plus') matchesPrice = price > 500;

    // 5. Quick filters match
    let matchesQuick = true;
    if (activeQuickFilters.has('in-stock') && p.inStock === false) {
      matchesQuick = false;
    }
    if (activeQuickFilters.has('out-of-stock') && p.inStock !== false) {
      matchesQuick = false;
    }
    if (activeQuickFilters.has('discount') && !(p.oldPrice && Number(p.oldPrice) > Number(p.price))) {
      matchesQuick = false;
    }
    if (activeQuickFilters.has('under-100') && price >= 100) {
      matchesQuick = false;
    }
    if (activeQuickFilters.has('100-500') && (price < 100 || price > 500)) {
      matchesQuick = false;
    }

    return matchesName && matchesCategory && matchesSubCategory && matchesPrice && matchesQuick;
  });
  
  updateActiveFilterBadges();
  renderProductsUI(filtered);
}

function renderProductsUI(products) {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  let html = '';
  // Sort by ID descending to show newest products first
  products.sort((a, b) => Number(b.id) - Number(a.id)).forEach(product => {
    const inStock = product.inStock !== false;
    const customOffer = (product.offer || product.offerBadge || '').trim();
    const discountPercent = (product.oldPrice && Number(product.oldPrice) > Number(product.price)) 
      ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100) 
      : null;
    const badgeLabel = customOffer || (discountPercent ? `${discountPercent}% OFF` : '');

    const rawYt = product.youtube_url || product.videoLink || '';
    const rawIg = product.instagram_url || '';
    let finalYtUrl = rawYt.trim();
    let finalIgUrl = rawIg.trim();
    
    if (finalYtUrl.includes('instagram.com')) {
      finalIgUrl = finalYtUrl;
      finalYtUrl = '';
    } else if (finalIgUrl.includes('youtube.com') || finalIgUrl.includes('youtu.be')) {
      finalYtUrl = finalIgUrl;
      finalIgUrl = '';
    }

    let ytEmbed = null;
    if (finalYtUrl) {
      const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = finalYtUrl.match(regExp);
      ytEmbed = (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1` : null;
    }

    let igEmbed = null;
    if (finalIgUrl) {
      const match = finalIgUrl.match(/instagram\.com\/(reel|p|tv)\/([^/?#&]+)/i);
      if (match) {
        const mediaType = match[1] === 'tv' ? 'reel' : match[1];
        igEmbed = `https://www.instagram.com/${mediaType}/${match[2]}/embed`;
      }
    }

    const isYtShort = finalYtUrl.includes('/shorts/');

    html += `
      <div class="product-card ${!inStock ? 'out-of-stock' : ''}" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;">
        <div class="product-img-wrapper">
          <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" style="${!inStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
          ${!inStock ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span class="product-category">${product.category}${product.subCategory ? ` > ${product.subCategory}` : ''}</span>
            ${product.unit ? `<span class="product-unit-pill">${product.unit}</span>` : ''}
          </div>
          <h3 class="product-title" style="${!inStock ? 'color: var(--text-muted);' : ''}">${product.name}</h3>
          ${product.desc ? `<p class="product-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.95rem; color: var(--text-muted); margin-bottom: 0.8rem; line-height: 1.6;">${product.desc}</p>` : ''}
          
          <div class="product-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.65rem; border-top: 1px solid #f1f5f9;">
            ${product.price ? `
            <div class="product-price-amazon">
              <span class="price-main">₹${product.price}</span>
              ${(product.oldPrice && Number(product.oldPrice) > Number(product.price)) ? `
                <span class="price-mrp">MRP ₹${product.oldPrice}</span>
                <span class="price-off">${Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% off</span>
              ` : ''}
            </div>
            ` : '<div></div>'}

            <div class="status-badge ${inStock ? 'in-stock' : 'out-stock'}">
              <span class="status-dot"></span>
              ${inStock ? 'In Stock' : 'Out of Stock'}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  if (products.length === 0) {
    html = `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: white; border-radius: 20px; border: 1px dashed #cbd5e1;">
        <i class="fa-solid fa-box-open" style="font-size: 3.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
        <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">No products found</h3>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Try adjusting your search terms or filters to find what you're looking for.</p>
      </div>
    `;
  }

  productsContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Mobile Navigation Drawer & Backdrop Handling
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  const mobileNavCloseBtn = document.getElementById('mobileNavCloseBtn');
  let backdrop = document.querySelector('.filter-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'filter-backdrop';
    document.body.appendChild(backdrop);
  }
  
  const closeNavDrawer = () => {
    if (navLinks) navLinks.classList.remove('nav-active');
    if (backdrop) backdrop.classList.remove('active');
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-times', 'fa-xmark');
        icon.classList.add('fa-bars');
      }
    }
  };

  const openNavDrawer = () => {
    if (navLinks) navLinks.classList.add('nav-active');
    if (backdrop) backdrop.classList.add('active');
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      }
    }
  };

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (navLinks && navLinks.classList.contains('nav-active')) {
        closeNavDrawer();
      } else {
        openNavDrawer();
      }
    });
  }

  if (mobileNavCloseBtn) {
    mobileNavCloseBtn.addEventListener('click', closeNavDrawer);
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeNavDrawer();
      const sidebar = document.querySelector('.sidebar-filters');
      if (sidebar) sidebar.classList.remove('open');
    });
  }

  document.querySelectorAll('.drawer-menu-list a').forEach(link => {
    link.addEventListener('click', closeNavDrawer);
  });

  // --- 1. INSTANT LOAD: Load cached products & category order/images from LocalStorage ---
  try {
    const cachedOrder = localStorage.getItem('cachedCategoryOrder');
    if (cachedOrder) {
      categoryCustomOrder = JSON.parse(cachedOrder);
    }
    const cachedImgs = localStorage.getItem('cachedCategoryImages');
    if (cachedImgs) {
      categoryCustomImages = JSON.parse(cachedImgs);
    }
    const cachedData = localStorage.getItem('cachedProducts');
    if (cachedData) {
      const parsedProducts = JSON.parse(cachedData);
      if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
        allProducts = parsedProducts;
        renderSidebarFilters(allProducts, activeCategory);
        renderCategoryPills(allProducts, activeCategory);
        renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
        renderHomeCategories(allProducts);
        performSearch();
      }
    }
  } catch (e) {
    console.warn("Local storage cache read error:", e);
  }

  // Listen for real-time Category Order & Metadata from Firestore
  listenForCategoryOrder((savedData) => {
    if (savedData) {
      if (Array.isArray(savedData)) {
        categoryCustomOrder = savedData;
      } else {
        categoryCustomOrder = savedData.order || [];
        const rawImgs = savedData.images || {};
        categoryCustomImages = {};
        Object.keys(rawImgs).forEach(k => {
          categoryCustomImages[k] = resolveDirectImageUrl(rawImgs[k]);
        });
      }
    }
    try {
      localStorage.setItem('cachedCategoryOrder', JSON.stringify(categoryCustomOrder));
      localStorage.setItem('cachedCategoryImages', JSON.stringify(categoryCustomImages));
    } catch(e) {}
    renderSidebarFilters(allProducts, activeCategory);
    renderCategoryPills(allProducts, activeCategory);
    renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
    renderHomeCategories(allProducts);
  });

  // --- 2. REAL-TIME SYNC: Listen for products from Firestore ---
  listenForProducts(async (products) => {
    const activeProducts = products.filter(p => p.isDeleted !== true);
    
    activeProducts.forEach(p => {
      if (p.image) {
        p.image = resolveDirectImageUrl(p.image);
      }
    });
    allProducts = activeProducts;
    
    try {
      localStorage.setItem('cachedProducts', JSON.stringify(activeProducts));
    } catch (e) {
      console.warn("Local storage cache write error:", e);
    }
    
    renderSidebarFilters(activeProducts, activeCategory);
    renderCategoryPills(activeProducts, activeCategory);
    renderSubCategoryPills(activeProducts, activeCategory, activeSubCategory);
    renderHomeCategories(activeProducts);
    performSearch();
  });

  // Search Logic & Listeners
  const searchInput = document.getElementById('productSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchHistoryList = document.getElementById('searchHistoryList');
  const categoryFilter = document.getElementById('categoryFilter');

  if (categoryFilter) {
    categoryFilter.addEventListener('change', performSearch);
  }

  // Price Filter Listeners
  const priceRadios = document.querySelectorAll('input[name="priceFilter"]');
  if (priceRadios.length > 0) {
    priceRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const priceContainer = document.getElementById('sidebarPriceList');
        if (priceContainer) {
          priceContainer.querySelectorAll('.filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
        }
        if (radio.closest('.filter-radio-label')) {
          radio.closest('.filter-radio-label').classList.add('active-filter');
        }
        performSearch();
      });
    });
  }

  // Accordion Expand / Collapse Handlers
  document.querySelectorAll('.filter-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.closest('.filter-accordion');
      if (accordion) {
        accordion.classList.toggle('collapsed');
      }
    });
  });

  // Mobile Sidebar & Filter Drawer Toggle with Backdrop
  const mobileOpenBtn = document.getElementById('mobileFilterOpenBtn');
  const mobileCloseBtn = document.getElementById('mobileFilterCloseBtn');
  const sidebar = document.getElementById('sidebarFiltersDrawer') || document.querySelector('.sidebar-filters');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const clearAllFiltersInline = document.getElementById('clearAllFiltersInline');
  const clearSubcatBtn = document.getElementById('clearSubcatBtn');

  // Ensure backdrop element exists
  if (!backdrop) {
    backdrop = document.querySelector('.filter-backdrop') || document.createElement('div');
    if (!backdrop.parentElement) {
      backdrop.className = 'filter-backdrop';
      document.body.appendChild(backdrop);
    }
  }

  const openDrawer = () => {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (mobileOpenBtn) {
    mobileOpenBtn.addEventListener('click', openDrawer);
  }
  if (mobileCloseBtn) {
    mobileCloseBtn.addEventListener('click', closeDrawer);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      performSearch();
      closeDrawer();
    });
  }

  // Reset Filters logic
  const resetAllFilters = () => {
    activeCategory = 'all';
    activeSubCategory = 'all';
    activeQuickFilters.clear();

    // Reset UI elements
    document.querySelectorAll('.quick-chip-btn').forEach(b => b.classList.remove('active'));
    const allCategoryRadio = document.querySelector('input[name="categoryFilterRadio"][value="all"]');
    if (allCategoryRadio) {
      allCategoryRadio.checked = true;
      document.querySelectorAll('#sidebarCategoryList .filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
      allCategoryRadio.closest('.filter-radio-label')?.classList.add('active-filter');
    }

    const allPriceRadio = document.querySelector('input[name="priceFilter"][value="all"]');
    if (allPriceRadio) {
      allPriceRadio.checked = true;
      document.querySelectorAll('#sidebarPriceList .filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
      allPriceRadio.closest('.filter-radio-label')?.classList.add('active-filter');
    }

    renderSidebarFilters(allProducts, activeCategory);
    renderCategoryPills(allProducts, activeCategory);
    renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
    performSearch();
  };

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      resetAllFilters();
      closeDrawer();
    });
  }

  if (clearAllFiltersInline) {
    clearAllFiltersInline.addEventListener('click', resetAllFilters);
  }

  if (clearSubcatBtn) {
    clearSubcatBtn.addEventListener('click', () => {
      activeSubCategory = 'all';
      renderSubCategoryPills(allProducts, activeCategory, activeSubCategory);
      performSearch();
    });
  }

  // Quick Action Chips Listeners
  document.querySelectorAll('.quick-chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      const filterKey = chip.getAttribute('data-filter');
      
      if (activeQuickFilters.has(filterKey)) {
        activeQuickFilters.delete(filterKey);
        chip.classList.remove('active');
      } else {
        // If selecting in-stock, unselect out-of-stock & vice-versa
        if (filterKey === 'in-stock') {
          activeQuickFilters.delete('out-of-stock');
          document.querySelector('.quick-chip-btn[data-filter="out-of-stock"]')?.classList.remove('active');
        } else if (filterKey === 'out-of-stock') {
          activeQuickFilters.delete('in-stock');
          document.querySelector('.quick-chip-btn[data-filter="in-stock"]')?.classList.remove('active');
        }
        
        activeQuickFilters.add(filterKey);
        chip.classList.add('active');
      }
      performSearch();
    });
  });

  // 1. Carousel Scroll Arrows for Tier 1 Categories
  const catContainer = document.getElementById('categoryPillsContainer');
  const catScrollLeftBtn = document.getElementById('catScrollLeftBtn');
  const catScrollRightBtn = document.getElementById('catScrollRightBtn');

  if (catScrollLeftBtn && catContainer) {
    catScrollLeftBtn.addEventListener('click', () => {
      catContainer.scrollBy({ left: -220, behavior: 'smooth' });
    });
  }

  if (catScrollRightBtn && catContainer) {
    catScrollRightBtn.addEventListener('click', () => {
      catContainer.scrollBy({ left: 220, behavior: 'smooth' });
    });
  }

  if (catContainer) {
    catContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        catContainer.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
      }
    }, { passive: false });
  }

  // 2. Carousel Scroll Arrows for Tier 2 Subcategories
  const subcatContainer = document.getElementById('subcategoryPillsContainer');
  const scrollLeftBtn = document.getElementById('subcatScrollLeftBtn');
  const scrollRightBtn = document.getElementById('subcatScrollRightBtn');

  if (scrollLeftBtn && subcatContainer) {
    scrollLeftBtn.addEventListener('click', () => {
      subcatContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });
  }

  if (scrollRightBtn && subcatContainer) {
    scrollRightBtn.addEventListener('click', () => {
      subcatContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }

  if (subcatContainer) {
    subcatContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        subcatContainer.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
      }
    }, { passive: false });
  }

  // --- Smart Search System with Dropdown & History ---
  const MAX_HISTORY = 5;
  const getHistory = () => JSON.parse(localStorage.getItem('searchHistory') || '[]');
  
  const saveHistory = (term) => {
    if (!term || term.length < 2) return;
    let history = getHistory();
    history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
    history.unshift(term);
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem('searchHistory', JSON.stringify(history));
  };

  const deleteHistoryItem = (term) => {
    let history = getHistory();
    history = history.filter(item => item !== term);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    renderSearchDropdown();
  };

  const renderSearchDropdown = () => {
    if (!searchHistoryList || !searchInput) return;
    const term = searchInput.value.toLowerCase().trim();

    if (term.length > 0) {
      const matches = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.desc && p.desc.toLowerCase().includes(term))
      ).slice(0, 5);

      if (matches.length === 0) {
        searchHistoryList.innerHTML = `
          <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            No matching items found for "<strong>${term}</strong>"
          </div>
        `;
        searchHistoryList.style.display = 'block';
        return;
      }

      let suggestHTML = `
        <div class="search-dropdown-section-header">
          <i class="fa-solid fa-sparkles" style="color: var(--primary);"></i> Matching Products (${matches.length})
        </div>
      `;

      matches.forEach(item => {
        suggestHTML += `
          <div class="search-suggest-item" data-id="${item.id}" data-name="${item.name}">
            <img src="${item.image}" alt="${item.name}" class="suggest-img">
            <div class="suggest-info">
              <span class="suggest-title">${item.name}</span>
              <div class="suggest-meta">
                <span class="suggest-price">₹${item.price}</span>
                <span>• ${item.category}</span>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #cbd5e1; font-size: 0.8rem;"></i>
          </div>
        `;
      });

      searchHistoryList.innerHTML = suggestHTML;
      searchHistoryList.style.display = 'block';

      searchHistoryList.querySelectorAll('.search-suggest-item').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.getAttribute('data-name');
          searchInput.value = name;
          saveHistory(name);
          performSearch();
          searchHistoryList.style.display = 'none';
        });
      });
      return;
    }

    const history = getHistory();
    const popularTags = ['Biscuits', 'Maggi', 'Ice Cream', 'Chocolate', 'Bread', 'Beverages'];

    let dropdownHTML = '';

    if (history.length > 0) {
      dropdownHTML += `
        <div class="search-dropdown-section-header">
          <i class="fa-solid fa-clock-rotate-left"></i> Recent Searches
        </div>
      `;
      history.forEach(item => {
        dropdownHTML += `
          <div class="search-history-item" data-term="${item}">
            <div class="search-history-text">
              <i class="fa-solid fa-magnifying-glass" style="color: #94a3b8; font-size: 0.8rem;"></i>
              <span>${item}</span>
            </div>
            <i class="fa-solid fa-xmark search-history-delete" data-term="${item}"></i>
          </div>
        `;
      });
    }

    dropdownHTML += `
      <div class="search-dropdown-section-header" style="margin-top: 0.4rem;">
        <i class="fa-solid fa-fire" style="color: #f59e0b;"></i> Popular Searches
      </div>
      <div class="trending-chips-container">
        ${popularTags.map(tag => `<span class="trending-chip" data-tag="${tag}"><i class="fa-solid fa-arrow-trend-up"></i> ${tag}</span>`).join('')}
      </div>
    `;

    searchHistoryList.innerHTML = dropdownHTML;
    searchHistoryList.style.display = 'block';

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

    searchHistoryList.querySelectorAll('.trending-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        searchInput.value = tag;
        saveHistory(tag);
        performSearch();
        searchHistoryList.style.display = 'none';
      });
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      performSearch();
      renderSearchDropdown();
    });
    
    searchInput.addEventListener('focus', () => {
      renderSearchDropdown();
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (searchHistoryList) searchHistoryList.style.display = 'none';
      }, 250);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const term = searchInput.value.trim();
        if (term.length >= 2) {
          saveHistory(term);
        }
        if (searchHistoryList) searchHistoryList.style.display = 'none';
        searchInput.blur();
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
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

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
