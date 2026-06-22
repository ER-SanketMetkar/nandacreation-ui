import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, Search, Plus, Minus, Trash2,
  Award, ArrowLeft, LogOut, CheckCircle,
  ExternalLink, ShieldCheck, UserCheck, Image,
  FileText, ChevronRight, X
} from 'lucide-react';

//const API_BASE = 'http://localhost:5277';
const API_BASE = 'https://nandacreations-api-hgc4ekdgbdf3ghhb.centralindia-01.azurewebsites.net';

export default function App() {
  // Global View States
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'admin'
  const [adminToken, setAdminToken] = useState(localStorage.getItem('nanda_admin_token') || null);
  const [adminUser, setAdminUser] = useState(JSON.parse(localStorage.getItem('nanda_admin_user')) || null);

  // Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Catalog Filter/Search States
  const [activeCategory, setActiveCategory] = useState(null); // category ID or null
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price-asc' | 'price-desc'
  const [selectedProduct, setSelectedProduct] = useState(null); // product object for detail modal

  // Cart State
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('nanda_cart')) || []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Admin Login State
  const [adminLogin, setAdminLogin] = useState({ username: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin Dashboard States
  const [adminActiveTab, setAdminActiveTab] = useState('inventory'); // 'inventory' | 'orders'
  const [adminOrders, setAdminOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false); // false = create, true = edit
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    stockQuantity: '',
    isFeatured: false,
    isHandmade: true,
    craftedBy: 'Harsha Chitale'
  });

  // Toast Notification State
  const [toasts, setToasts] = useState([]);

  // References
  const fileInputRef = useRef(null);
  const aboutSectionRef = useRef(null);

  // Sync Cart to localStorage
  useEffect(() => {
    localStorage.setItem('nanda_cart', JSON.stringify(cart));
  }, [cart]);

  // Load Initial Data
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Sync filters whenever active category, search, min/max price, or sort order changes
  useEffect(() => {
    fetchProducts();
  }, [activeCategory, sortBy]);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        showToast('Failed to load categories', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API server', 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch Products with filters
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      let url = `${API_BASE}/api/products?`;
      if (activeCategory) url += `categoryId=${activeCategory}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (minPrice) url += `minPrice=${minPrice}&`;
      if (maxPrice) url += `maxPrice=${maxPrice}&`;

      const res = await fetch(url);
      if (res.ok) {
        let data = await res.json();

        // Frontend sorting
        if (sortBy === 'price-asc') {
          data.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-desc') {
          data.sort((a, b) => b.price - a.price);
        } // 'newest' is sorted descending by CreatedAt from API

        setProducts(data);
      } else {
        showToast('Failed to load products', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to API server', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch Orders for Admin
  const fetchOrders = async () => {
    if (!adminToken) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminOrders(data);
      } else if (res.status === 401) {
        handleLogout();
        showToast('Admin session expired. Please log in again.', 'error');
      } else {
        showToast('Failed to load orders', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Trigger loading orders when tab changes
  useEffect(() => {
    if (activeTab === 'admin' && adminActiveTab === 'orders' && adminToken) {
      fetchOrders();
    }
  }, [activeTab, adminActiveTab, adminToken]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Add Product to Cart
  const addToCart = (product) => {
    if (product.stockQuantity <= 0) {
      showToast('Item is out of stock', 'error');
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          showToast(`Cannot add more. Only ${product.stockQuantity} items in stock.`, 'error');
          return prevCart;
        }
        showToast(`Increased quantity of ${product.name} in cart`);
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      showToast(`Added ${product.name} to cart`);
      return [...prevCart, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  // Modify Cart Item Quantity
  const updateCartQty = (productId, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stockQuantity) {
            showToast(`Cannot exceed available stock of ${item.product.stockQuantity}`, 'error');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Remove Item from Cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Item removed from cart');
  };

  // Total amount in cart
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Scroll to Creator Spotlight
  const scrollToAbout = () => {
    setActiveTab('shop');
    setCheckoutMode(false);
    setTimeout(() => {
      aboutSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle Client Checkout (API path)
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmittingOrder(true);
    try {
      const orderDto = {
        customerName: checkoutForm.name,
        customerEmail: checkoutForm.email,
        customerPhone: checkoutForm.phone,
        shippingAddress: checkoutForm.address,
        notes: checkoutForm.notes,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDto)
      });

      if (res.ok) {
        showToast('Order placed successfully! Thank you.', 'success');
        setCart([]);
        setCheckoutForm({ name: '', email: '', phone: '', address: '', notes: '' });
        setCheckoutMode(false);
        fetchProducts(); // refresh inventory stocks
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'Failed to place order. Check stock availability.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while placing order', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Handle WhatsApp Checkout
  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      showToast('Name, Phone, and Address are required for WhatsApp checkout.', 'error');
      return;
    }

    // Pre-fill WhatsApp message text
    let messageText = `Hello Harsha Chitale, I would like to place an order from *Nanda Creations*:\n\n`;
    cart.forEach((item, index) => {
      messageText += `${index + 1}. *${item.product.name}* (Qty: ${item.quantity}) - ₹${item.product.price.toLocaleString('en-IN')}/each\n`;
    });
    messageText += `\n*Total Amount:* ₹${cartTotal.toLocaleString('en-IN')}\n\n`;
    messageText += `*Shipping Details:*\n`;
    messageText += `- *Name:* ${checkoutForm.name}\n`;
    messageText += `- *Phone:* ${checkoutForm.phone}\n`;
    messageText += `- *Address:* ${checkoutForm.address}\n`;
    if (checkoutForm.notes) {
      messageText += `- *Notes:* ${checkoutForm.notes}\n`;
    }
    messageText += `\nPlease confirm my handmade order and share payment details. Thank you!`;

    // Process saving to DB in background so inventory remains consistent
    saveOrderSilently();

    // Open WhatsApp link (using placeholder number +919876543210 as Harsha's phone)
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/7620168287?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  // Saves order silently to database during WhatsApp redirect to sync stock quantities
  const saveOrderSilently = async () => {
    try {
      const orderDto = {
        customerName: checkoutForm.name,
        customerEmail: checkoutForm.email || 'whatsapp-order@nandacreations.com',
        customerPhone: checkoutForm.phone,
        shippingAddress: checkoutForm.address,
        notes: `[WhatsApp Checkout Redirected] ${checkoutForm.notes || ''}`,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDto)
      });

      if (res.ok) {
        setCart([]);
        setCheckoutForm({ name: '', email: '', phone: '', address: '', notes: '' });
        setCheckoutMode(false);
        fetchProducts(); // Refresh stocks
      }
    } catch (err) {
      console.error('Silent order save error:', err);
    }
  };

  // Admin Login Handle
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminLogin)
      });
      if (res.ok) {
        const data = await res.json();
        setAdminToken(data.token);
        setAdminUser(data);
        localStorage.setItem('nanda_admin_token', data.token);
        localStorage.setItem('nanda_admin_user', JSON.stringify(data));
        showToast(`Welcome back, ${data.fullName}!`);
        setAdminLogin({ username: '', password: '' });
        setAdminActiveTab('inventory');
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'Invalid admin credentials', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to authentication service', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  // Admin Logout
  const handleLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('nanda_admin_token');
    localStorage.removeItem('nanda_admin_user');
    showToast('Logged out successfully');
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingImage(true);
    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setProductForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
        showToast('Image uploaded successfully!');
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'Image upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during image upload', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add / Edit Product Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.categoryId || !productForm.name || !productForm.price || !productForm.stockQuantity) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    const payload = {
      categoryId: parseInt(productForm.categoryId),
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price),
      imageUrl: productForm.imageUrl,
      stockQuantity: parseInt(productForm.stockQuantity),
      isFeatured: productForm.isFeatured,
      isHandmade: productForm.isHandmade,
      craftedBy: productForm.craftedBy || 'Harsha Chitale'
    };

    try {
      let res;
      if (isEditingProduct) {
        // Edit existing product
        res = await fetch(`${API_BASE}/api/products/${editingProductId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new product
        res = await fetch(`${API_BASE}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(isEditingProduct ? 'Product updated successfully' : 'New product created successfully');
        resetProductForm();
        fetchProducts(); // Refresh catalog products list
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to save product details.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving product details.', 'error');
    }
  };

  const startEditProduct = (product) => {
    setIsEditingProduct(true);
    setEditingProductId(product.id);
    setProductForm({
      categoryId: product.categoryId.toString(),
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      imageUrl: product.imageUrl || '',
      stockQuantity: product.stockQuantity.toString(),
      isFeatured: product.isFeatured,
      isHandmade: product.isHandmade,
      craftedBy: product.craftedBy
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This action is permanent.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        showToast('Product deleted successfully');
        fetchProducts();
      } else {
        showToast('Failed to delete product', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting product', 'error');
    }
  };

  const resetProductForm = () => {
    setIsEditingProduct(false);
    setEditingProductId(null);
    setProductForm({
      categoryId: '',
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      stockQuantity: '',
      isFeatured: false,
      isHandmade: true,
      craftedBy: 'Harsha Chitale'
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast(`Order status updated to ${newStatus}`);
        fetchOrders();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating order status', 'error');
    }
  };

  // Filter Reset
  const handleResetFilters = () => {
    setActiveCategory(null);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    // Fetch products will be triggered automatically by activeCategory/sortBy changes
    setTimeout(() => fetchProducts(), 50);
  };

  return (
    <div>
      {/* Toast Notification HUD */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {t.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Floating Glass Navbar */}
      <header className="glass-navbar">
        <div className="navbar-container">
          <div className="brand-logo" onClick={() => { setActiveTab('shop'); setCheckoutMode(false); }}>
            <span className="brand-title">NANDA CREATIONS</span>
            <span className="brand-subtitle">Handcrafted Maharashtrian Jewelry</span>
          </div>

          <ul className="nav-links">
            <li
              className={`nav-link ${activeTab === 'shop' && !checkoutMode ? 'active' : ''}`}
              onClick={() => { setActiveTab('shop'); setCheckoutMode(false); }}
            >
              Shop Catalog
            </li>
            <li className="nav-link" onClick={scrollToAbout}>
              Meet Craftsperson
            </li>
            <li
              className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Dashboard
            </li>
          </ul>

          <div className="nav-actions">
            {activeTab === 'shop' && (
              <button className="cart-icon-btn" onClick={() => setIsCartOpen(true)} aria-label="Open Shopping Cart">
                <ShoppingBag size={24} />
                {cart.length > 0 && <span className="cart-badge">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}
              </button>
            )}

            {adminToken && activeTab === 'admin' && (
              <button className="admin-logout-btn" onClick={handleLogout}>
                <LogOut size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEW: SHOP CATALOG */}
      {activeTab === 'shop' && (
        <main className="animate-fade-in" style={{ paddingTop: '80px' }}>

          {/* HERO BANNER SECTION */}
          {!checkoutMode && (
            <section
              className="hero-section"
              style={{ backgroundImage: `url(${API_BASE}/images/hero_banner.png)` }}
            >
              <div className="hero-overlay"></div>
              <div className="hero-content">
                <span className="hero-tag">Auspicious & Authentic</span>
                <h1 className="hero-title">Treasured Heritage<br />Handcrafted For You</h1>
                <p className="hero-description">
                  Discover a beautiful collection of traditional Maharashtrian jewelry including basra pearl Naths,
                  intricate Kolhapuri Saaj, and customized Thushi chokers. Individually crafted by owner <strong>Harsha Chitale</strong>.
                </p>
                <button
                  className="hero-btn"
                  onClick={() => {
                    const el = document.getElementById('catalog-start');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Browse Collection
                </button>
              </div>
            </section>
          )}

          {/* SHOPPING FLOW vs CHECKOUT FLOW */}
          {!checkoutMode ? (
            <>
              {/* Category Slider / Horizontal Circle Navigation */}
              <div id="catalog-start" style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
                <div className="section-title-container">
                  <span className="section-subtitle">Exquisite Artistry</span>
                  <h2 className="section-title">Shop by Category</h2>
                </div>

                <div className="categories-grid">
                  <div
                    className={`category-circle-card ${activeCategory === null ? 'active' : ''}`}
                    onClick={() => setActiveCategory(null)}
                  >
                    <div className="category-circle-image" style={{ backgroundColor: 'var(--primary-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <ShoppingBag size={32} />
                    </div>
                    <span className="category-circle-name">All Jewelry</span>
                  </div>

                  {loadingCategories ? (
                    <div className="spinner"></div>
                  ) : (
                    categories.map(cat => (
                      <div
                        key={cat.id}
                        className={`category-circle-card ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        <img
                          src={`${API_BASE}${cat.imageUrl}`}
                          alt={cat.name}
                          className="category-circle-image"
                          onError={(e) => { e.target.src = `${API_BASE}/images/hero_banner.png`; }}
                        />
                        <span className="category-circle-name">{cat.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Main Products Grid & Filter Panel */}
              <section className="catalog-container">
                {/* Filter Sidebar */}
                <aside className="filters-sidebar">
                  <div className="filter-group">
                    <h3 className="filter-group-title">Search Catalog</h3>
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        placeholder="Search product name..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                      />
                      <button
                        onClick={fetchProducts}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        className="search-icon"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="filter-group">
                    <h3 className="filter-group-title">Price Range (₹)</h3>
                    <div className="price-range-inputs">
                      <input
                        type="number"
                        placeholder="Min"
                        className="price-input"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="price-input"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={fetchProducts}
                      className="hero-btn"
                      style={{ width: '100%', padding: '0.5rem', marginTop: '0.8rem', fontSize: '0.85rem' }}
                    >
                      Apply Filter
                    </button>
                  </div>

                  <button className="reset-filters-btn" onClick={handleResetFilters}>
                    Reset All Filters
                  </button>
                </aside>

                {/* Products Grid Area */}
                <div className="products-display">
                  <div className="display-header">
                    <span className="products-count">
                      Showing {products.length} {products.length === 1 ? 'item' : 'items'}
                    </span>

                    <select
                      className="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="newest">Sort by: Newest Arrivals</option>
                      <option value="price-asc">Sort by: Price (Low to High)</option>
                      <option value="price-desc">Sort by: Price (High to Low)</option>
                    </select>
                  </div>

                  {loadingProducts ? (
                    <div className="spinner" style={{ margin: '5rem auto' }}></div>
                  ) : products.length === 0 ? (
                    <div className="empty-cart-message" style={{ margin: '4rem auto' }}>
                      <ShoppingBag size={48} />
                      <p>No products found matching your current filters.</p>
                      <button className="reset-filters-btn" onClick={handleResetFilters} style={{ width: 'auto', padding: '0.6rem 2rem' }}>
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    <div className="products-grid">
                      {products.map(prod => (
                        <article key={prod.id} className="product-card">
                          <div className="product-badges">
                            {prod.isHandmade && <span className="badge badge-handmade">Handmade</span>}
                            {prod.isFeatured && <span className="badge badge-featured">Featured</span>}
                            {prod.stockQuantity <= 0 && <span className="badge badge-out-of-stock">Out of Stock</span>}
                          </div>

                          <div
                            className="product-image-container"
                            onClick={() => setSelectedProduct(prod)}
                          >
                            <img
                              src={`${API_BASE}${prod.imageUrl}`}
                              alt={prod.name}
                              className="product-image"
                              onError={(e) => { e.target.src = `${API_BASE}/images/hero_banner.png`; }}
                              loading="lazy"
                            />
                          </div>

                          <div className="product-details">
                            <span className="product-category-name">{prod.category?.name}</span>
                            <h3 className="product-name" onClick={() => setSelectedProduct(prod)}>{prod.name}</h3>
                            <p className="product-description-excerpt">{prod.description}</p>

                            <div className="product-footer">
                              <span className="product-price">₹{prod.price.toLocaleString('en-IN')}
                                <span className="shipping-text"> + shipping charges</span>
                              </span>
                              <button
                                className="add-to-cart-btn"
                                onClick={() => addToCart(prod)}
                                disabled={prod.stockQuantity <= 0}
                              >
                                <Plus size={16} /> Add to Cart
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Creator Spotlight Spotlight */}
              <section className="about-section" ref={aboutSectionRef}>
                <div className="about-container">
                  <div className="about-text-content">
                    <span className="about-badge">The Heart of Nanda Creations</span>
                    <h2 className="about-title">Meet Owner & Craftsperson Harsha Chitale</h2>
                    <p className="about-paragraph">
                      Every single piece of jewelry at Nanda Creations is handcrafted individually by Harsha Chitale.
                      Rooted in the royal jewelry traditions of Maharashtra, Harsha brings decades of design experience,
                      selecting premium pearls, vibrant rubies, and gold bead threadings to construct ornaments of authentic heritage.
                    </p>
                    <blockquote className="about-quote">
                      "Traditional Maharashtrian jewelry is not just ornamentation; it represents a centuries-old heritage of auspiciousness, grace, and Peshwai grandeur. I hand-make each piece to ensure the legacy of authentic craftsmanship resides in your family heirlooms."
                    </blockquote>
                    <span className="about-signature">— Harsha Chitale, Owner & Designer</span>
                  </div>

                  <div className="about-image-card">
                    <img
                      src={`${API_BASE}/images/hero_banner.png`}
                      alt="Harsha Chitale Handcrafting Jewelry"
                      className="about-portrait"
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* CHECKOUT VIEW */
            <section className="checkout-container animate-fade-in">
              <h2 className="checkout-step-title">
                <ShoppingBag size={24} style={{ color: 'var(--primary-purple)' }} /> Complete Your Purchase
              </h2>

              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--gray-light)', borderRadius: 'var(--border-radius-md)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>Order Summary</h3>
                {cart.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ flexGrow: 1 }}>{item.product.name} (x{item.quantity})</span>
                    <span style={{ fontWeight: 'bold' }}>₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--gray-medium)', marginTop: '0.8rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Grand Total</span>
                  <span style={{ color: 'var(--primary-purple)', fontSize: '1.1rem' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <form onSubmit={handlePlaceOrder}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={checkoutForm.name}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 12345678790"
                      className="form-input"
                      value={checkoutForm.phone}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Email Address (Optional)</label>
                    <input
                      type="email"
                      className="form-input"
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Shipping Address *</label>
                    <textarea
                      required
                      rows="3"
                      className="form-textarea"
                      value={checkoutForm.address}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, address: e.target.value }))}
                    ></textarea>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Customization Notes (e.g. adjust thread length, pearl density)</label>
                    <textarea
                      rows="2"
                      placeholder="Share your specific request with Harsha..."
                      className="form-textarea"
                      value={checkoutForm.notes}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                    ></textarea>
                  </div>
                </div>

                <div className="checkout-actions">
                  <button
                    type="button"
                    className="checkout-back-btn"
                    onClick={() => setCheckoutMode(false)}
                  >
                    Back to Catalog
                  </button>

                  <button
                    type="submit"
                    className="btn-place-order"
                    disabled={submittingOrder}
                  >
                    {submittingOrder ? 'Processing...' : 'Place Order'}
                  </button>

                  <button
                    type="button"
                    className="btn-whatsapp-order"
                    onClick={handleWhatsAppCheckout}
                  >
                    Confirm via WhatsApp <ExternalLink size={16} />
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* SLIDE CART DRAWER */}
          {isCartOpen && (
            <div className="modal-overlay" onClick={() => setIsCartOpen(false)} style={{ background: 'rgba(0,0,0,0.4)', padding: 0 }}>
              <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="cart-header">
                  <h3 className="cart-title"><ShoppingBag size={20} /> Your Shopping Bag</h3>
                  <button className="close-drawer-btn" onClick={() => setIsCartOpen(false)}>
                    <X size={24} />
                  </button>
                </div>

                <div className="cart-items-container">
                  {cart.length === 0 ? (
                    <div className="empty-cart-message">
                      <ShoppingBag size={48} />
                      <p>Your bag is empty.</p>
                      <button className="hero-btn" style={{ fontSize: '0.85rem' }} onClick={() => setIsCartOpen(false)}>
                        Start Shopping
                      </button>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="cart-item">
                        <img
                          src={`${API_BASE}${item.product.imageUrl}`}
                          alt={item.product.name}
                          className="cart-item-image"
                          onError={(e) => { e.target.src = `${API_BASE}/images/hero_banner.png`; }}
                        />
                        <div className="cart-item-info">
                          <h4 className="cart-item-name">{item.product.name}</h4>
                          <span className="cart-item-price">₹{item.product.price.toLocaleString('en-IN')}</span>

                          <div className="cart-item-actions">
                            <div className="quantity-controller">
                              <button className="qty-btn" onClick={() => updateCartQty(item.product.id, -1)} aria-label="Decrease quantity">
                                <Minus size={12} />
                              </button>
                              <span className="qty-value">{item.quantity}</span>
                              <button className="qty-btn" onClick={() => updateCartQty(item.product.id, 1)} aria-label="Increase quantity">
                                <Plus size={12} />
                              </button>
                            </div>

                            <button className="remove-item-btn" onClick={() => removeFromCart(item.product.id)}>
                              <Trash2 size={14} /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="cart-summary">
                    <div className="summary-row">
                      <span>Total Amount:</span>
                      <span className="summary-total">₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <button
                      className="checkout-btn"
                      onClick={() => {
                        setIsCartOpen(false);
                        setCheckoutMode(true);
                      }}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DETAIL MODAL */}
          {selectedProduct && (
            <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
              <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={() => setSelectedProduct(null)}>
                  <X size={20} />
                </button>

                <div className="modal-image-container">
                  <img
                    src={`${API_BASE}${selectedProduct.imageUrl}`}
                    alt={selectedProduct.name}
                    className="modal-image"
                    onError={(e) => { e.target.src = `${API_BASE}/images/hero_banner.png`; }}
                  />
                </div>

                <div className="modal-info">
                  <span className="modal-category">{selectedProduct.category?.name}</span>
                  <h2 className="modal-name">{selectedProduct.name}</h2>

                  <div className="modal-creator-badge">
                    <Award size={16} /> Hand-woven by {selectedProduct.craftedBy}
                  </div>

                  <p className="modal-description">{selectedProduct.description}</p>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--gray-dark)' }}>
                      <ShieldCheck size={16} style={{ color: 'var(--secondary-gold)' }} />
                      <span>Authentic Materials</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--gray-dark)' }}>
                      <UserCheck size={16} style={{ color: 'var(--secondary-gold)' }} />
                      <span>Handmade Guarantee</span>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-medium)', display: 'block' }}>Best Price</span>
                      <span className="modal-price">₹{selectedProduct.price.toLocaleString('en-IN')}</span>
                    </div>

                    <button
                      className="add-to-cart-btn"
                      style={{ padding: '0.8rem 1.8rem', fontSize: '0.95rem' }}
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      disabled={selectedProduct.stockQuantity <= 0}
                    >
                      <Plus size={18} /> Add to Bag
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* ADMIN TABS & VIEWPORTS */}
      {activeTab === 'admin' && (
        <main className="animate-fade-in" style={{ paddingTop: '80px', minHeight: '80vh' }}>
          {!adminToken ? (
            /* ADMIN LOGIN CARD */
            <div className="admin-login-card">
              <div className="admin-login-header">
                <h2 className="admin-login-title">Administrator Login</h2>
                <p className="admin-login-subtitle">Access Nanda Creations Inventory and Orders</p>
              </div>

              <form onSubmit={handleAdminLogin}>
                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. harsha"
                    className="form-input"
                    value={adminLogin.username}
                    onChange={(e) => setAdminLogin(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    value={adminLogin.password}
                    onChange={(e) => setAdminLogin(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  className="checkout-btn"
                  disabled={loggingIn}
                >
                  {loggingIn ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : (
            /* ADMIN DASHBOARD */
            <div className="admin-dashboard-container">
              <div className="admin-header-row">
                <div className="admin-title-wrap">
                  <span className="admin-badge-name">Administrative Console</span>
                  <h1>Nanda Creations Management</h1>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--gray-dark)' }}>
                  Active User: <strong>{adminUser?.fullName}</strong>
                </div>
              </div>

              <div className="admin-tabs">
                <button
                  className={`admin-tab ${adminActiveTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setAdminActiveTab('inventory')}
                >
                  Inventory Management
                </button>
                <button
                  className={`admin-tab ${adminActiveTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setAdminActiveTab('orders')}
                >
                  Customer Orders
                </button>
              </div>

              {/* INVENTORY TAB VIEWPORT */}
              {adminActiveTab === 'inventory' && (
                <div className="animate-fade-in" style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
                  {/* Create / Edit Form Panel */}
                  <div className="admin-form-panel">
                    <h3 className="admin-form-title">
                      {isEditingProduct ? `Edit Product: "${productForm.name}"` : 'Add New Handcrafted Product'}
                    </h3>

                    <form onSubmit={handleProductSubmit}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Product Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Peshwai Nath"
                            className="form-input"
                            value={productForm.name}
                            onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Category *</label>
                          <select
                            required
                            className="form-select"
                            value={productForm.categoryId}
                            onChange={(e) => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                          >
                            <option value="">Select Category</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Price (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="e.g. 1250"
                            className="form-input"
                            value={productForm.price}
                            onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Stock Quantity *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="e.g. 15"
                            className="form-input"
                            value={productForm.stockQuantity}
                            onChange={(e) => setProductForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
                          />
                        </div>

                        <div className="form-group full-width">
                          <label className="form-label">Product Description</label>
                          <textarea
                            rows="3"
                            placeholder="Provide descriptive catalog copy explaining style, pearl counts..."
                            className="form-textarea"
                            value={productForm.description}
                            onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                          ></textarea>
                        </div>

                        {/* Image Upload Block */}
                        <div className="form-group full-width">
                          <label className="form-label">Product Image File</label>
                          <div className="image-upload-preview-row">
                            <div className="image-preview-box">
                              {productForm.imageUrl ? (
                                <img
                                  src={`${API_BASE}${productForm.imageUrl}`}
                                  alt="Preview"
                                  className="image-preview"
                                />
                              ) : (
                                <Image size={24} style={{ color: 'var(--gray-medium)' }} />
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div className="upload-btn-wrapper">
                                <button type="button" className="btn-upload-file">
                                  {uploadingImage ? 'Uploading Image...' : 'Choose File to Upload'}
                                </button>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--gray-medium)' }}>
                                Recommended square ratio image, JPG/PNG, Max 5MB.
                              </span>
                            </div>

                            <div style={{ flexGrow: 1 }}>
                              <label className="form-label">Or Specify Image Path/URL manually</label>
                              <input
                                type="text"
                                placeholder="/images/placeholder.jpg"
                                className="form-input"
                                value={productForm.imageUrl}
                                onChange={(e) => setProductForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-checkbox-label">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={productForm.isFeatured}
                              onChange={(e) => setProductForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
                            />
                            Feature this Product (Highlight on home screen)
                          </label>
                        </div>

                        <div className="form-group">
                          <label className="form-checkbox-label">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={productForm.isHandmade}
                              onChange={(e) => setProductForm(prev => ({ ...prev, isHandmade: e.target.checked }))}
                            />
                            Hand-made by Harsha Chitale
                          </label>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Craftsperson Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={productForm.craftedBy}
                            onChange={(e) => setProductForm(prev => ({ ...prev, craftedBy: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="checkout-actions" style={{ marginTop: '2rem' }}>
                        <button type="submit" className="btn-place-order" style={{ flexGrow: 0, width: '200px' }}>
                          {isEditingProduct ? 'Update Product' : 'Create Product'}
                        </button>
                        {isEditingProduct && (
                          <button type="button" className="checkout-back-btn" onClick={resetProductForm}>
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Products Table */}
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Thumbnail</th>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Features</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(prod => (
                          <tr key={prod.id}>
                            <td>
                              <img
                                src={`${API_BASE}${prod.imageUrl}`}
                                alt={prod.name}
                                className="table-thumbnail"
                                onError={(e) => { e.target.src = `${API_BASE}/images/hero_banner.png`; }}
                              />
                            </td>
                            <td style={{ fontWeight: 'bold' }}>{prod.name}</td>
                            <td>{prod.category?.name}</td>
                            <td>₹{prod.price.toLocaleString('en-IN')}</td>
                            <td>
                              <span style={{ color: prod.stockQuantity <= 3 ? '#d9534f' : 'inherit', fontWeight: prod.stockQuantity <= 3 ? 'bold' : 'normal' }}>
                                {prod.stockQuantity}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                {prod.isHandmade && <span className="badge badge-handmade" style={{ fontSize: '0.6rem' }}>Handmade</span>}
                                {prod.isFeatured && <span className="badge badge-featured" style={{ fontSize: '0.6rem' }}>Featured</span>}
                              </div>
                            </td>
                            <td>
                              <div className="table-action-btns">
                                <button className="table-btn table-btn-edit" onClick={() => startEditProduct(prod)}>
                                  Edit
                                </button>
                                <button className="table-btn table-btn-delete" onClick={() => deleteProduct(prod.id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ORDERS TAB VIEWPORT */}
              {adminActiveTab === 'orders' && (
                <div className="animate-fade-in" style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
                  {loadingOrders ? (
                    <div className="spinner" style={{ margin: '5rem auto' }}></div>
                  ) : adminOrders.length === 0 ? (
                    <div className="empty-cart-message" style={{ margin: '4rem auto' }}>
                      <FileText size={48} />
                      <p>No customer orders placed yet.</p>
                    </div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Order Date</th>
                            <th>Customer Info</th>
                            <th>Products Ordered</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminOrders.map(order => (
                            <tr key={order.id}>
                              <td style={{ fontWeight: 'bold' }}>#{order.id}</td>
                              <td>{new Date(order.orderDate).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong>{order.customerName}</strong>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-medium)' }}>{order.customerPhone}</span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-medium)' }}>{order.customerEmail}</span>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-dark)', marginTop: '4px', maxWidth: '220px', whiteSpace: 'normal' }}>
                                    {order.shippingAddress}
                                  </span>
                                  {order.notes && (
                                    <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--primary-purple)', marginTop: '4px', maxWidth: '220px', whiteSpace: 'normal' }}>
                                      Note: "{order.notes}"
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                  {order.orderItems?.map(item => (
                                    <li key={item.id} style={{ fontSize: '0.85rem', marginBottom: '3px' }}>
                                      - {item.product?.name} <strong>(x{item.quantity})</strong> @ ₹{item.unitPrice.toLocaleString('en-IN')}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td style={{ fontWeight: 'bold', color: 'var(--primary-purple)', fontSize: '0.95rem' }}>
                                ₹{order.totalAmount.toLocaleString('en-IN')}
                              </td>
                              <td>
                                <select
                                  className="form-select"
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', width: '130px' }}
                                  value={order.status}
                                  onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Elegant Footer Panel */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="brand-title" style={{ color: 'var(--secondary-gold)' }}>NANDA CREATIONS</span>
            <p className="footer-description">
              Exquisite traditional Maharashtrian jewelry, individually hand-made by owner and craftsperson Harsha Chitale.
            </p>

          </div>

          <div>
            <h4 className="footer-title">Help & Info</h4>
            <ul className="footer-links">
              <li>Shop Catalog</li>
              <li onClick={scrollToAbout} style={{ cursor: 'pointer' }}>Meet the Craftsperson</li>
              <li>WhatsApp Consultation</li>
              <li>Shipping & Handcrafting Policies</li>
            </ul>
          </div>

          <div>
            <h4 className="footer-title">Our Workshop</h4>
            <ul className="footer-links" style={{ color: 'var(--gray-medium)' }}>
              <li>Pune, Maharashtra, India</li>
              <li>Work Hours: Mon - Sat: 10 AM - 7 PM</li>
              <li>Email: nc.nandacreations@gmail.com</li>
              <li>WhatsApp: +91 7620168287</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Nanda Creations. All rights reserved.</span>
          <span>Designed with Love in Maharashtra</span>
        </div>
      </footer>
    </div>
  );
}
