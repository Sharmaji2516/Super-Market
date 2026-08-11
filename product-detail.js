import { listenForProducts } from './firebase-config.js?v=1.1.0';

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const icon = menuBtn.querySelector('i');
      if (icon) {
        if (navLinks.classList.contains('active')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        } else {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      }
    });
  }

  const container = document.getElementById('productDetailContainer');
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
        <h2>Product Not Found</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">We couldn't find the product you're looking for.</p>
        <a href="products.html" class="btn" style="background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Browse All Products</a>
      </div>
    `;
    return;
  }

  listenForProducts((products) => {
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h2>Product Not Available</h2>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">This product might have been removed or is no longer available.</p>
          <a href="products.html" class="btn" style="background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Back to Products</a>
        </div>
      `;
      return;
    }

    // Render product details
    const inStock = product.inStock !== false;
    const discountPercent = (product.oldPrice && Number(product.oldPrice) > Number(product.price)) 
      ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100) 
      : null;

    const waMsg = encodeURIComponent(`Hello CHITTORGARH HUB, I am interested in buying:\n*Product:* ${product.name}\n*Price:* ₹${product.price}${product.unit ? ' (' + product.unit + ')' : ''}`);
    const waUrl = `https://wa.me/917014974762?text=${waMsg}`;

    container.innerHTML = `
      <div class="product-page-layout">
        <!-- Image Section -->
        <div class="product-page-img-container">
          ${discountPercent ? `<div class="product-badge" style="background: #2563eb; position: absolute; top: 1rem; left: 1rem; padding: 6px 12px; border-radius: 8px; color: white; font-weight: 800; font-size: 0.9rem;">${discountPercent}% OFF</div>` : (product.offer ? `<div class="product-badge" style="position: absolute; top: 1rem; left: 1rem;">${product.offer}</div>` : '')}
          <img src="${product.image}" alt="${product.name}" class="product-page-img" ${!inStock ? 'style="filter: grayscale(1); opacity: 0.6;"' : ''}>
          ${!inStock ? '<div class="out-of-stock-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 8px; font-weight: 800;">OUT OF STOCK</div>' : ''}
        </div>

        <!-- Details Section -->
        <div class="product-page-details">
          <div class="product-page-meta">
            <span class="product-page-cat">${product.category}${product.subCategory ? ` <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; margin: 0 4px;"></i> ${product.subCategory}` : ''}</span>
            ${product.unit ? `<span class="product-page-unit">${product.unit}</span>` : ''}
          </div>
          
          <h1 class="product-page-title">${product.name}</h1>
          
          <div class="product-page-price-box">
            <span class="product-page-price">₹${product.price}</span>
            ${(product.oldPrice && Number(product.oldPrice) > Number(product.price)) ? `<span class="product-page-old-price">₹${product.oldPrice}</span>` : ''}
          </div>
          
          <div class="product-page-stock ${inStock ? 'stock-in' : 'stock-out'}">
            <i class="fa-solid ${inStock ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${inStock ? 'Currently In Stock' : 'Currently Out of Stock'}
          </div>

          <div class="product-page-desc">
            <h3>Description</h3>
            <p>${product.desc ? product.desc.replace(/\\n/g, '<br>') : 'No description available for this product.'}</p>
          </div>

          <div class="product-page-actions">
            ${product.videoLink ? `
              <a href="${product.videoLink}" target="_blank" class="product-page-btn video-btn">
                <i class="fa-brands fa-youtube"></i> Watch Video Demo
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });
});
