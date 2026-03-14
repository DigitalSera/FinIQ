// ===== State Management & Persistence =====
let state = {
    inventory: JSON.parse(localStorage.getItem('finiq_inventory')) || [],
    sales: JSON.parse(localStorage.getItem('finiq_sales')) || [],
    expenses: JSON.parse(localStorage.getItem('finiq_expenses')) || [],
    settings: JSON.parse(localStorage.getItem('finiq_settings')) || { businessName: 'My Retail Store', capital: 0 }
};

let cart = []; // Temporary cart for POS
let chartInstance = null;

// ===== DOM Elements =====
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-links a');
const viewTitle = document.getElementById('current-view-title');
const headerBusinessName = document.getElementById('header-business-name');

// Global Overlays
const welcomeModal = document.getElementById('welcome-modal');
const btnWelcomeDemo = document.getElementById('btn-welcome-demo');
const btnWelcomeStart = document.getElementById('btn-welcome-start');
const btnLoadDemo = document.getElementById('btn-load-demo');

// Dashboard Elements
const dashTimeframe = document.getElementById('dash-timeframe');
const dashRevenue = document.getElementById('dash-revenue');
const dashCogs = document.getElementById('dash-cogs');
const dashGross = document.getElementById('dash-gross');
const dashExpenses = document.getElementById('dash-expenses');
const dashNet = document.getElementById('dash-net');
const insightCard = document.getElementById('insight-of-the-day');
const insightMessage = document.getElementById('insight-message');

// POS Elements
const posProductGrid = document.getElementById('pos-product-grid');
const posSearchInput = document.getElementById('pos-search-input');
const cartItemsContainer = document.getElementById('cart-items');
const cartRevenueTotal = document.getElementById('cart-revenue-total');
const btnCheckout = document.getElementById('btn-checkout');

// Inventory Elements
const inventoryBody = document.getElementById('inventory-body');
const quickAddForm = document.getElementById('quick-add-form');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

// Sales History Elements
const salesHistoryList = document.getElementById('sales-history-list');

// Expense Elements
const expenseForm = document.getElementById('expense-form');
const expensesList = document.getElementById('expenses-list');

// Health Score & Leakage Elements
const healthScoreValue = document.getElementById('health-score-value');
const healthStatusText = document.getElementById('health-status-text');
const healthStatusDesc = document.getElementById('health-status-desc');
const scoreRing = document.getElementById('score-ring');
const leakStatusBadge = document.getElementById('leak-status-badge');
const leakageAlertsContainer = document.getElementById('leakage-alerts-container');

// Settings Elements
const settingsForm = document.getElementById('settings-form');
const btnResetData = document.getElementById('btn-reset-data');

// AI Elements
const aiInput = document.getElementById('ai-input');
const aiSend = document.getElementById('ai-send');
const chatHistory = document.getElementById('chat-history');
const promptChips = document.querySelectorAll('.prompt-chip');

// ===== Utility Functions =====
const formatCurrency = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
const formatDate = (dateString, time = false) => {
    const d = new Date(dateString);
    if(time) return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return d.toLocaleDateString();
};
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const saveState = () => {
    localStorage.setItem('finiq_inventory', JSON.stringify(state.inventory));
    localStorage.setItem('finiq_sales', JSON.stringify(state.sales));
    localStorage.setItem('finiq_expenses', JSON.stringify(state.expenses));
    localStorage.setItem('finiq_settings', JSON.stringify(state.settings));
};
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
};

// Auto Refresh UI Simulation (gives the user visual feedback that UI updated globally)
const triggerAutoRefresh = (callback) => {
    document.body.classList.add('refreshing');
    saveState();
    setTimeout(() => {
        callback(); // Re-render logic
        updateDashboard();
        updateHealthAndLeakage();
        document.body.classList.remove('refreshing');
    }, 250);
};

// Return dates based on timeframe selection
const getDateFilter = () => {
    const period = dashTimeframe.value;
    const now = new Date();
    let startDate = new Date(0); // All time default
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate.setHours(0,0,0,0);
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return startDate;
};


// ===== Initialization & Navigation =====
const init = () => {
    headerBusinessName.textContent = state.settings.businessName;
    document.getElementById('set-name').value = state.settings.businessName;
    document.getElementById('set-capital').value = state.settings.capital;
    
    // Default today's date in expense form
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];

    // Welcome Screen Logic
    if (state.inventory.length === 0 && state.sales.length === 0 && state.expenses.length === 0) {
        if(welcomeModal) welcomeModal.classList.remove('hidden');
    }

    updateDashboard(); // Renders charts and totals
    renderInventory();
    renderPOSProducts();
    renderExpenses();
    renderSalesHistory();
    updateHealthAndLeakage();
};

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        
        // Update Nav Active State
        navLinks.forEach(n => n.classList.remove('active'));
        link.classList.add('active');
        
        // Update Views
        views.forEach(v => { v.classList.remove('active-view'); v.classList.add('hidden'); });
        document.getElementById(targetId).classList.remove('hidden');
        document.getElementById(targetId).classList.add('active-view');
        
        // Update Header Title (ignore if settings)
        viewTitle.textContent = link.textContent.trim();
        
        // View-specific actions requiring fresh renders
        if (targetId === 'dashboard') updateDashboard();
        if (targetId === 'pos') renderPOSProducts();
        if (targetId === 'health') updateHealthAndLeakage();
        if (targetId === 'sales-history') renderSalesHistory();
    });
});

// ===== Demo Data Logic =====
const getDemoHTML = (prefix) => `
    <div style="margin-bottom: 12px; text-align: left; width: 100%;">
        <label style="color:var(--text-muted); font-size:12px; text-transform:uppercase;">Business Type</label>
        <select id="${prefix}-biz-type" class="tech-select" style="margin-bottom: 8px;">
            <option value="retail">General Retail Store</option>
            <option value="food">Food & Beverages Vendor</option>
            <option value="pharmacy">Pharmacy/Chemist</option>
            <option value="fashion">Fashion & Clothing Store</option>
        </select>
        <label style="color:var(--text-muted); font-size:12px; text-transform:uppercase;">Scenario</label>
        <select id="${prefix}-scenario" class="tech-select" style="margin-bottom: 16px;">
            <option value="thriving">Thriving Business</option>
            <option value="struggling">Struggling Business (Profit Leaks)</option>
        </select>
    </div>
`;

if (welcomeModal) {
    const actions = welcomeModal.querySelector('.modal-actions');
    if (actions) actions.insertAdjacentHTML('afterbegin', getDemoHTML('modal'));
}
if (btnLoadDemo) {
    const cont = document.createElement('div');
    cont.innerHTML = getDemoHTML('settings');
    btnLoadDemo.parentElement.parentElement.insertBefore(cont.firstElementChild, btnLoadDemo.parentElement);
}

function loadDemoData(isModal = false) {
    const hasData = state.inventory.length > 0 || state.sales.length > 0 || state.expenses.length > 0;
    if(hasData && !confirm('This will wipe your current data and load a demo dataset. Continue?')) return;
    
    let bizType = 'retail';
    let scenario = 'thriving';
    
    if (isModal) {
        const typeEl = document.getElementById('modal-biz-type');
        const scenEl = document.getElementById('modal-scenario');
        if (typeEl) bizType = typeEl.value;
        if (scenEl) scenario = scenEl.value;
    } else {
        const typeEl = document.getElementById('settings-biz-type');
        const scenEl = document.getElementById('settings-scenario');
        if (typeEl) bizType = typeEl.value;
        if (scenEl) scenario = scenEl.value;
    }
    
    triggerAutoRefresh(() => {
        const now = new Date();
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }

        const isStruggling = scenario === 'struggling';

        const catalogs = {
            retail: [
                { name: 'Indomie Noodles', uom: 'Cartons', cost: 4500, price: 5500 },
                { name: 'Peak Milk Refill', uom: 'Sachets', cost: 1500, price: 1800 },
                { name: 'Golden Penny Rice', uom: 'Bags', cost: 42000, price: 46000 },
                { name: 'Coca-Cola', uom: 'Packs', cost: 2000, price: 2500 },
                { name: 'Power Oil', uom: 'Sachets', cost: 850, price: 1000 },
                { name: 'Dangote Sugar', uom: 'Bags', cost: 3800, price: 4200 },
                { name: 'Milo Refill', uom: 'Sachets', cost: 2100, price: 2500 },
                { name: 'Ariel Detergent', uom: 'Sachets', cost: 800, price: 1000 },
                { name: 'Geisha Mackerel', uom: 'Tins', cost: 750, price: 900 },
                { name: 'Dano Milk', uom: 'Tins', cost: 1200, price: 1500 }
            ],
            food: [
                { name: 'Jollof Rice w/ Chicken', uom: 'Portions', cost: 1200, price: 2500 },
                { name: 'Fried Rice w/ Beef', uom: 'Portions', cost: 1200, price: 2500 },
                { name: 'Pounded Yam & Egusi', uom: 'Portions', cost: 1500, price: 3000 },
                { name: 'Suya', uom: 'Sticks', cost: 300, price: 600 },
                { name: 'Zobo Drink', uom: 'Bottles', cost: 200, price: 500 },
                { name: 'Beef Sausage Roll', uom: 'Pieces', cost: 150, price: 300 },
                { name: 'Meat Pie', uom: 'Pieces', cost: 300, price: 600 },
                { name: 'Chilled Coke', uom: 'Bottles', cost: 150, price: 300 },
                { name: 'Bottled Water', uom: 'Bottles', cost: 100, price: 200 },
                { name: 'Moi Moi', uom: 'Wraps', cost: 200, price: 400 }
            ],
            pharmacy: [
                { name: 'Paracetamol', uom: 'Cards', cost: 100, price: 200 },
                { name: 'Vitamin C', uom: 'Bottles', cost: 300, price: 500 },
                { name: 'Artemether (Anti-malaria)', uom: 'Packs', cost: 800, price: 1500 },
                { name: 'Cough Syrup', uom: 'Bottles', cost: 600, price: 1000 },
                { name: 'Amoxicillin', uom: 'Cards', cost: 400, price: 800 },
                { name: 'Bandages', uom: 'Rolls', cost: 50, price: 150 },
                { name: 'Hand Sanitizer', uom: 'Bottles', cost: 500, price: 1000 },
                { name: 'Blood Tonic', uom: 'Bottles', cost: 900, price: 1500 },
                { name: 'ORS', uom: 'Sachets', cost: 50, price: 100 },
                { name: 'Inhaler', uom: 'Pieces', cost: 2500, price: 4000 }
            ],
            fashion: [
                { name: 'Ankara Fabric', uom: 'Yards', cost: 5000, price: 8000 },
                { name: 'Plain T-Shirt', uom: 'Pieces', cost: 2000, price: 4000 },
                { name: 'Denim Jeans', uom: 'Pieces', cost: 4000, price: 8000 },
                { name: 'Sneakers', uom: 'Pairs', cost: 10000, price: 18000 },
                { name: 'Leather Slippers', uom: 'Pairs', cost: 3000, price: 6000 },
                { name: 'Handbag', uom: 'Pieces', cost: 6000, price: 12000 },
                { name: 'Baseball Cap', uom: 'Pieces', cost: 1000, price: 2500 },
                { name: 'Men Native Wear', uom: 'Sets', cost: 15000, price: 25000 },
                { name: 'Sunglasses', uom: 'Pieces', cost: 1500, price: 4000 },
                { name: 'Wristwatch', uom: 'Pieces', cost: 4000, price: 10000 }
            ]
        };

        let catalog = catalogs[bizType] || catalogs['retail'];
        
        // Generate Inventory
        let inv = catalog.map((item, idx) => {
            let sellP = item.price;
            let qty = isStruggling ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 50) + 20;

            // Introduce leakage strictly for struggling scenario
            if (isStruggling && idx % 3 === 0) {
                sellP = item.cost * 0.9; // Sell below cost
            }

            return { 
                id: generateId(), 
                name: item.name, 
                uom: item.uom, 
                costPrice: item.cost, 
                sellingPrice: sellP, 
                stock: qty, 
                minStockAlert: 10, 
                createdAt: dates[0].getTime() 
            };
        });

        // Generate Sales 30-day pattern
        let sales = [];
        dates.forEach((d, dayIndex) => {
            // Some days have no sales in struggling scenario
            if(isStruggling && Math.random() < 0.3) return;
            
            // Random number of transactions a day
            let txCount = isStruggling ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 8) + 3;
            
            // On weekend (Saturday=6), more sales for thriving
            if(!isStruggling && d.getDay() === 6) txCount += Math.floor(Math.random() * 5) + 3;
            
            for(let t = 0; t < txCount; t++) {
                let saleItems = [];
                let totalRev = 0, totalCOGS = 0;
                
                let itemCount = Math.floor(Math.random() * 3) + 1;
                let usedIdx = new Set();
                
                for(let i = 0; i < itemCount; i++) {
                    let rIdx = Math.floor(Math.random() * inv.length);
                    if(usedIdx.has(rIdx)) continue;
                    usedIdx.add(rIdx);
                    
                    let prod = inv[rIdx];
                    let qty = Math.floor(Math.random() * 3) + 1;
                    
                    let rev = qty * prod.sellingPrice;
                    let cogs = qty * prod.costPrice;
                    
                    saleItems.push({
                        itemId: prod.id,
                        name: prod.name,
                        uom: prod.uom,
                        quantity: qty,
                        salePrice: prod.sellingPrice,
                        costPrice: prod.costPrice,
                        subtotalRev: rev,
                        subtotalCOGS: cogs
                    });
                    
                    totalRev += rev;
                    totalCOGS += cogs;
                }
                
                if (saleItems.length > 0) {
                    let saleDate = new Date(d);
                    saleDate.setHours(9 + Math.floor(Math.random() * 8));
                    saleDate.setMinutes(Math.floor(Math.random() * 60));
                    
                    sales.push({
                        id: generateId(),
                        date: saleDate.toISOString(),
                        totalRevenue: totalRev,
                        totalCOGS: totalCOGS,
                        items: saleItems
                    });
                }
            }
        });

        // Generate Expenses
        let expenses = [];
        let expCategories = ['Transport', 'Electricity', 'Rent', 'Salaries', 'Marketing', 'Other (Misc)'];
        
        dates.forEach((d) => {
            let chance = isStruggling ? 0.3 : 0.1;
            if(Math.random() < chance) {
                let cat = expCategories[Math.floor(Math.random() * expCategories.length)];
                let factor = isStruggling ? (Math.random() * 10000 + 5000) : (Math.random() * 3000 + 1000);
                
                let expDate = new Date(d);
                expDate.setHours(10 + Math.floor(Math.random() * 5));
                
                expenses.push({ 
                    id: generateId(), 
                    date: expDate.toISOString(), 
                    amount: Math.round(factor), 
                    category: cat, 
                    notes: 'Demo generated expense' 
                });
            }
        });
        
        // Add one large rent expense midway to make charts realistic
        expenses.push({
            id: generateId(),
            date: dates[15].toISOString(),
            amount: isStruggling ? 450000 : 50000,
            category: 'Rent',
            notes: 'Monthly Shop Rent'
        });

        state.inventory = inv;
        state.sales = sales;
        state.expenses = expenses;
        state.settings.capital = isStruggling ? 20000 : 200000;
        state.settings.businessName = "Demo " + bizType.charAt(0).toUpperCase() + bizType.slice(1) + " Store (" + scenario + ")";
        
        saveState();
        document.getElementById('set-capital').value = state.settings.capital;
        document.getElementById('set-name').value = state.settings.businessName;
        headerBusinessName.textContent = state.settings.businessName;

        showToast('Extensive demo data loaded seamlessly!', 'success');
        
        init();
    });
}

if(btnWelcomeStart) {
    btnWelcomeStart.addEventListener('click', () => { welcomeModal.classList.add('hidden'); });
}
if(btnWelcomeDemo) {
    btnWelcomeDemo.addEventListener('click', () => { welcomeModal.classList.add('hidden'); loadDemoData(true); });
}
if(btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => loadDemoData(false));
}

// ===== Dashboard Logic =====
dashTimeframe.addEventListener('change', updateDashboard);

function updateDashboard() {
    const startDate = getDateFilter();
    
    let totalRevenue = 0, totalCOGS = 0, totalExpenses = 0;

    const filteredSales = state.sales.filter(s => new Date(s.date) >= startDate);
    filteredSales.forEach(sale => {
        totalRevenue += sale.totalRevenue;
        totalCOGS += sale.totalCOGS;
    });

    const filteredExpenses = state.expenses.filter(e => new Date(e.date) >= startDate);
    filteredExpenses.forEach(exp => {
        totalExpenses += exp.amount;
    });

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    dashRevenue.textContent = formatCurrency(totalRevenue);
    dashCogs.textContent = formatCurrency(totalCOGS);
    dashGross.textContent = formatCurrency(grossProfit);
    dashExpenses.textContent = formatCurrency(totalExpenses);
    dashNet.textContent = formatCurrency(netProfit);

    dashNet.style.color = netProfit >= 0 ? 'var(--purple-color)' : 'var(--danger-color)';

    updateChart(filteredSales, filteredExpenses);
    generateInsights(grossProfit, totalRevenue, totalExpenses);
}

function generateInsights(grossProfit, totalRevenue, totalExpenses) {
    if(!insightCard) return;
    if (state.sales.length === 0 && state.expenses.length === 0) {
        insightCard.classList.add('hidden');
        return;
    }
    insightCard.classList.remove('hidden');

    let insights = [];

    // Leakage check 1: Expenses ratio
    if (totalRevenue > 0 && (totalExpenses / totalRevenue) > 0.7) {
        insights.push(`⚠ Your expenses are ${Math.round((totalExpenses / totalRevenue) * 100)}% of revenue. This may indicate profit leakage.`);
    }

    // Leakage check 2: Below cost
    let belowCostCount = 0;
    state.inventory.forEach(i => { if (i.sellingPrice < i.costPrice) belowCostCount++; });
    if (belowCostCount > 0) {
        insights.push(`⚠ ${belowCostCount} product(s) are selling below cost price.`);
    }

    // Product check 1: Most profitable product overall
    const productPerf = {};
    state.sales.forEach(s => {
        s.items.forEach(i => {
            if(!productPerf[i.name]) productPerf[i.name] = { rev: 0, cogs: 0 };
            productPerf[i.name].rev += i.subtotalRev;
            productPerf[i.name].cogs += i.subtotalCOGS;
        });
    });
    let best = null, maxProfit = -1;
    for (const [name, data] of Object.entries(productPerf)) {
        const p = data.rev - data.cogs;
        if (p > maxProfit) { maxProfit = p; best = name; }
    }
    if (best && maxProfit > 0) {
        insights.push(`💡 **${best}** is currently your most profitable product.`);
    }

    // Inventory check 1: Low stock
    const lows = state.inventory.filter(i => i.stock <= (i.minStockAlert||0));
    if (lows.length > 0) {
        insights.push(`📉 ${lows.length} product(s) are running low on stock.`);
    }
    
    // Choose one insight to display, prioritizing warnings
    if (insights.length > 0) {
        insightMessage.innerHTML = insights[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    } else {
        insightMessage.innerHTML = "🌟 Business is running smoothly! Keep up the good work.";
    }
}

function updateChart(sales, expenses) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const dailyData = {};
    
    sales.forEach(s => {
        const d = new Date(s.date).toLocaleDateString();
        if (!dailyData[d]) dailyData[d] = { revenue: 0, expenses: 0 };
        dailyData[d].revenue += s.totalRevenue;
    });
    
    expenses.forEach(e => {
        const d = new Date(e.date).toLocaleDateString();
        if (!dailyData[d]) dailyData[d] = { revenue: 0, expenses: 0 };
        dailyData[d].expenses += e.amount;
    });

    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.length ? sortedDates : ['No Data'];
    const revData = sortedDates.length ? sortedDates.map(d => dailyData[d].revenue) : [0];
    const netData = sortedDates.length ? sortedDates.map(d => dailyData[d].revenue - dailyData[d].expenses) : [0];

    if (chartInstance) chartInstance.destroy();

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue', data: revData,
                    borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2, fill: true, tension: 0.4
                },
                {
                    label: 'Net Profit', data: netData,
                    borderColor: '#c084fc', backgroundColor: 'transparent',
                    borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#f8fafc' } } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: (val) => '₦' + val } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ===== POS Logic =====
posSearchInput.addEventListener('input', (e) => renderPOSProducts(e.target.value));

function renderPOSProducts(searchQuery = '') {
    posProductGrid.innerHTML = '';
    const query = searchQuery.toLowerCase();
    
    const filtered = state.inventory.filter(item => 
        item.name.toLowerCase().includes(query) || (item.category && item.category.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        posProductGrid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-muted);">No products found in inventory.</div>';
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = `pos-item ${item.stock <= (item.minStockAlert||0) ? 'low-stock' : ''}`;
        div.innerHTML = `
            <div class="item-name">${item.name} <span style="font-size:12px; font-weight:normal; color:#94a3b8">/ ${item.uom||'unit'}</span></div>
            <div class="item-price">${formatCurrency(item.sellingPrice)}</div>
            <div class="item-stock ${item.stock <= (item.minStockAlert||0) ? 'danger' : ''}">
                ${item.stock > 0 ? `In Stock: ${item.stock}` : 'Out of Stock'}
            </div>
        `;
        if (item.stock > 0) {
            div.addEventListener('click', () => addToCart(item));
        } else {
            div.style.opacity = '0.5'; div.style.cursor = 'not-allowed';
        }
        posProductGrid.appendChild(div);
    });
}

function addToCart(item) {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
        if (existing.qty < item.stock) existing.qty++;
        else showToast('Cannot add more than available stock', 'warning');
    } else {
        cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

function updateCartQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    
    const maxStock = state.inventory.find(inv => inv.id === id).stock;
    
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(c => c.id !== id);
    } else if (item.qty > maxStock) {
        item.qty = maxStock;
        showToast('Maximum stock reached', 'warning');
    }
    renderCart();
}

function renderCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Select items to add to sale</div>';
        btnCheckout.disabled = true;
        cartRevenueTotal.textContent = '₦0.00';
        return;
    }

    btnCheckout.disabled = false;

    cart.forEach(item => {
        const subtotal = item.qty * item.sellingPrice;
        total += subtotal;

        const div = document.createElement('div');
        div.className = 'cart-row-item';
        div.innerHTML = `
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price">${formatCurrency(item.sellingPrice)} / ${item.uom||'unit'}</span>
            </div>
            <div class="cart-qty-ctrl">
                <button class="btn-qty" onclick="updateCartQty('${item.id}', -1)">-</button>
                <span>${item.qty} ${item.uom||''}</span>
                <button class="btn-qty" onclick="updateCartQty('${item.id}', 1)">+</button>
            </div>
            <div class="cart-item-sub">${formatCurrency(subtotal)}</div>
        `;
        cartItemsContainer.appendChild(div);
    });

    cartRevenueTotal.textContent = formatCurrency(total);
}

btnCheckout.addEventListener('click', () => {
    if (cart.length === 0) return;

    triggerAutoRefresh(() => {
        let saleTotalRev = 0, saleTotalCOGS = 0;
        const saleItems = [];

        cart.forEach(cartItem => {
            const invIndex = state.inventory.findIndex(inv => inv.id === cartItem.id);
            if (invIndex !== -1) state.inventory[invIndex].stock -= cartItem.qty;

            const rev = cartItem.qty * cartItem.sellingPrice;
            const cogs = cartItem.qty * cartItem.costPrice;
            
            saleTotalRev += rev;
            saleTotalCOGS += cogs;

            saleItems.push({
                itemId: cartItem.id,
                name: cartItem.name,
                uom: cartItem.uom,
                quantity: cartItem.qty,
                salePrice: cartItem.sellingPrice,
                costPrice: cartItem.costPrice,
                subtotalRev: rev,
                subtotalCOGS: cogs
            });
        });

        state.sales.push({
            id: generateId(),
            date: new Date().toISOString(),
            items: saleItems,
            totalRevenue: saleTotalRev,
            totalCOGS: saleTotalCOGS
        });

        cart = [];
        renderCart();
        renderPOSProducts();
        renderInventory();
        renderSalesHistory();
        showToast('Sale completed successfully!', 'success');
    });
});

// ===== Inventory Logic =====
quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerAutoRefresh(() => {
        const id = document.getElementById('inv-id').value;
        const name = document.getElementById('inv-name').value;
        const uom = document.getElementById('inv-uom').value;
        const cost = parseFloat(document.getElementById('inv-cost').value);
        const price = parseFloat(document.getElementById('inv-price').value);
        const stock = parseInt(document.getElementById('inv-stock').value);
        const alertLvl = 5; // Default low stock alert

        if (id) {
            const idx = state.inventory.findIndex(i => i.id === id);
            if (idx !== -1) {
                state.inventory[idx] = { ...state.inventory[idx], id, name, uom, costPrice: cost, sellingPrice: price, stock };
                showToast('Product updated');
            }
        } else {
            state.inventory.push({ id: generateId(), name, uom, costPrice: cost, sellingPrice: price, stock, minStockAlert: alertLvl, createdAt: Date.now() });
            showToast('Product added successfully');
        }

        renderInventory();
        renderPOSProducts();
        resetQuickAddForm();
    });
});

btnCancelEdit.addEventListener('click', () => { resetQuickAddForm(); });

function resetQuickAddForm() {
    quickAddForm.reset();
    document.getElementById('inv-id').value = '';
    btnCancelEdit.classList.add('hidden');
    document.querySelector('#quick-add-form button[type="submit"]').textContent = '+ Save';
}

function editProduct(id) {
    const p = state.inventory.find(i => i.id === id);
    if (!p) return;
    document.getElementById('inv-id').value = p.id;
    document.getElementById('inv-name').value = p.name;
    document.getElementById('inv-uom').value = p.uom || '';
    document.getElementById('inv-cost').value = p.costPrice;
    document.getElementById('inv-price').value = p.sellingPrice;
    document.getElementById('inv-stock').value = p.stock;
    
    document.querySelector('#quick-add-form button[type="submit"]').textContent = 'Update';
    btnCancelEdit.classList.remove('hidden');
    document.getElementById('inv-name').focus();
}

function deleteProduct(id) {
    if(confirm('Are you sure you want to delete this product?')) {
        triggerAutoRefresh(() => {
            state.inventory = state.inventory.filter(i => i.id !== id);
            renderInventory();
            renderPOSProducts();
            showToast('Product deleted');
        });
    }
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateCartQty = updateCartQty;

function renderInventory() {
    inventoryBody.innerHTML = '';
    
    if (state.inventory.length === 0) {
        inventoryBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No products added yet.</td></tr>`;
        return;
    }

    state.inventory.forEach(item => {
        const isLow = item.stock <= (item.minStockAlert||0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:600">${item.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">Per ${item.uom||'unit'}</div>
            </td>
            <td><span class="stock-badge ${isLow ? 'stock-low' : 'stock-good'}">${item.stock}</span></td>
            <td>${formatCurrency(item.costPrice)}</td>
            <td>${formatCurrency(item.sellingPrice)}</td>
            <td>${isLow ? '<span style="color:var(--danger-color)">Low Stock</span>' : '<span style="color:var(--success-color)">Healthy</span>'}</td>
            <td>
                <button class="action-btn" onclick="editProduct('${item.id}')">Edit</button>
                <button class="action-btn del" onclick="deleteProduct('${item.id}')">Delete</button>
            </td>
        `;
        inventoryBody.appendChild(tr);
    });
}

// ===== Sales History Logic =====
function renderSalesHistory() {
    salesHistoryList.innerHTML = '';
    const sorted = [...state.sales].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (sorted.length === 0) {
        salesHistoryList.innerHTML = '<div class="empty-alert">No sales recorded yet.</div>';
        return;
    }

    sorted.forEach(sale => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.style.gap = '12px';

        // Format items string e.g. "3 Bags of Rice, 2 Cartons of Water"
        const itemsStr = sale.items.map(i => `${i.quantity} ${i.uom||''} ${i.name}`).join(', ');

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                <span class="list-item-date">${formatDate(sale.date, true)}</span>
                <span class="list-item-amount" style="color:var(--text-main)">Total: ${formatCurrency(sale.totalRevenue)}</span>
            </div>
            <div style="font-size:14px; color:var(--text-muted);">
                Items: <span style="color:var(--text-main)">${itemsStr}</span>
            </div>
            <div style="font-size:12px; color:var(--success-color); align-self:flex-end;">
                Gross Profit: ${formatCurrency(sale.totalRevenue - sale.totalCOGS)}
            </div>
        `;
        salesHistoryList.appendChild(div);
    });
}

// ===== Expenses Logic =====
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerAutoRefresh(() => {
        const date = document.getElementById('exp-date').value;
        const amount = parseFloat(document.getElementById('exp-amount').value);
        const category = document.getElementById('exp-category').value;
        const notes = document.getElementById('exp-notes').value;

        state.expenses.push({ id: generateId(), date: new Date(date).toISOString(), amount, category, notes });
        renderExpenses();
        expenseForm.reset();
        document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        showToast('Expense recorded successfully');
    });
});

function renderExpenses() {
    expensesList.innerHTML = '';
    const sorted = [...state.expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
    
    if (sorted.length === 0) {
        expensesList.innerHTML = '<div class="empty-alert">No recent expenses.</div>';
        return;
    }

    sorted.forEach(exp => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-left">
                <span class="list-item-title">${exp.category} ${exp.notes ? `- ${exp.notes}` : ''}</span>
                <span class="list-item-date">${formatDate(exp.date)}</span>
            </div>
            <div class="list-item-amount red">${formatCurrency(exp.amount)}</div>
        `;
        expensesList.appendChild(div);
    });
}


// ===== Profit Leakage Engine & Health Logic =====
function updateHealthAndLeakage() {
    let totalRev = 0, totalCOGS = 0, totalExp = 0;
    state.sales.forEach(s => { totalRev += s.totalRevenue; totalCOGS += s.totalCOGS; });
    state.expenses.forEach(e => { totalExp += e.amount; });
    
    const grossProfit = totalRev - totalCOGS;
    const netProfit = grossProfit - totalExp;
    const capital = parseFloat(state.settings.capital) || 0;

    let score = 100;
    let leakageRiskLevel = 0; // 0 = No leakage, 100 = Critical leakage
    let leakageAlerts = [];

    // === Leakage Checks ===
    
    // 1. Unprofitable Sales (Negative Margin checks per item across all sales)
    const losingItems = new Set();
    state.sales.forEach(sale => {
        sale.items.forEach(item => {
            if (item.salePrice < item.costPrice) {
                losingItems.add(item.name);
                leakageRiskLevel += 10; 
            }
        });
    });
    if (losingItems.size > 0) {
        leakageAlerts.push({
            type: 'critical',
            msg: `Unprofitable Sales: You are selling ${Array.from(losingItems).join(', ')} below cost price! You lose money on every unit.`
        });
        score -= 20;
    }

    // 2. Dead Stock (Items added over 7 days ago but 0 sales)
    const allItemsSold = new Set();
    state.sales.forEach(s => s.items.forEach(i => allItemsSold.add(i.itemId)));
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const deadStock = state.inventory.filter(i => 
        !allItemsSold.has(i.id) && i.createdAt && (nowMs - i.createdAt > sevenDaysMs)
    );
    if (deadStock.length > 0) {
        leakageAlerts.push({
            type: 'warning',
            msg: `Dead Stock: ${deadStock.length} items (e.g. ${deadStock[0].name}) have sat in inventory for over a week with 0 sales. Your cash is tied up.`
        });
        leakageRiskLevel += 5;
    }

    // 3. High expense ratio relative to gross profit
    if (totalRev > 0) {
        const expenseRatio = totalExp / grossProfit;
        if (expenseRatio > 1 && capital === 0) {
            leakageAlerts.push({ type: 'critical', msg: `Overspending: Your expenses are completely wiping out your Gross Profit.`});
            leakageRiskLevel += 20;
            score -= 30;
        } else if (expenseRatio > 0.8) {
            leakageAlerts.push({ type: 'warning', msg: `High Expenses: Your overhead costs are consuming 80%+ of your profit.`});
            leakageRiskLevel += 10;
        }
    }

    // === Output Leakage UI ===
    leakageRiskLevel = Math.min(100, leakageRiskLevel);
    
    if (state.sales.length === 0 && state.expenses.length === 0) {
        leakStatusBadge.className = "stock-badge stock-good";
        leakStatusBadge.textContent = "Awaiting Data";
        leakageAlertsContainer.innerHTML = '<div class="empty-alert">We will monitor for profit leakages once you start trading.</div>';
    } else {
        if (leakageRiskLevel >= 30) {
            leakStatusBadge.className = "stock-badge stock-low"; 
            leakStatusBadge.textContent = "Critical Leakage Detected";
        } else if (leakageRiskLevel >= 10) {
            leakStatusBadge.className = "stock-badge stock-ok"; 
            leakStatusBadge.textContent = "Minor Leaks Detected";
        } else {
            leakStatusBadge.className = "stock-badge stock-good"; 
            leakStatusBadge.textContent = "No Major Leaks 🙌";
        }

        if (leakageAlerts.length > 0) {
            leakageAlertsContainer.innerHTML = leakageAlerts.map(a => 
                `<div class="alert-banner ${a.type}">
                    <span style="font-size:20px; flex-shrink:0;">${a.type === 'critical' ? '🚨' : '⚠️'}</span>
                    <span>${a.msg}</span>
                </div>`
            ).join('');
        } else {
            leakageAlertsContainer.innerHTML = '<div class="empty-alert" style="color:var(--success-color)">Your business is watertight. Excellent!</div>';
        }
    }

    // === Output Health UI ===
    // Account for capital
    if ((totalExp > (totalRev + capital)) && state.expenses.length > 0) score -= 40;

    score = Math.max(0, Math.min(100, score));

    let hColor, hStatus, hDesc;
    if (score >= 80) { hColor = 'var(--success-color)'; hStatus = 'Excellent'; hDesc = 'Strong financials. Cashflow is positive.'; }
    else if (score >= 50) { hColor = 'var(--warning-color)'; hStatus = 'Needs Attention'; hDesc = 'Business is surviving but monitor leakages closely.'; }
    else { hColor = 'var(--danger-color)'; hStatus = 'Critical Risk'; hDesc = 'Major profitability issues detected.'; }

    if (state.sales.length === 0 && state.expenses.length === 0) {
        hColor = 'var(--primary-color)'; hStatus = 'New Setup'; hDesc = 'Welcome! Add products and sales to begin.'; score = 100;
    }

    healthScoreValue.textContent = score;
    healthStatusText.textContent = hStatus;
    healthStatusText.style.color = hColor;
    healthStatusDesc.textContent = hDesc;
    scoreRing.style.background = `conic-gradient(${hColor} ${score}%, rgba(255,255,255,0.1) 0)`;
}

// ===== Settings Logic =====
settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerAutoRefresh(() => {
        state.settings.businessName = document.getElementById('set-name').value;
        state.settings.capital = parseFloat(document.getElementById('set-capital').value) || 0;
        headerBusinessName.textContent = state.settings.businessName;
        showToast('Settings saved successfully');
    });
});

btnResetData.addEventListener('click', () => {
    if (confirm("DANGER: This will delete ALL inventory, sales, and expense data. Are you absolutely sure?")) {
        localStorage.clear();
        location.reload();
    }
});


// ===== Advanced AI Assistant Logic (Educational Update) =====
aiSend.addEventListener('click', () => { handleAIPrompt(aiInput.value); aiInput.value = ''; });
aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleAIPrompt(aiInput.value); aiInput.value = ''; }});
promptChips.forEach(chip => chip.addEventListener('click', () => handleAIPrompt(chip.textContent)));

function handleAIPrompt(query) {
    if (!query.trim()) return;
    query = query.toLowerCase();

    let response = "";

    // Educational Dictionary
    if (query.includes("what is gross profit") || query.includes("gross profit mean")) {
        response = `**Gross Profit** is simply your Sales Revenue minus the Cost of Goods Sold (COGS). It shows how much money you make from the products themselves, before paying for operational things like rent or transport.`;
    }
    else if (query.includes("what is cogs") || query.includes("cost of goods")) {
        response = `**COGS** stands for Cost of Goods Sold. It means what you originally paid your supplier to buy the specific items that you just sold. E.g. If you bought a bag of rice for ₦30,000 and sold it for ₦35,000, your COGS is ₦30,000.`;
    }
    else if (query.includes("what is net profit") || query.includes("net profit mean")) {
        response = `**Net Profit** is your actual "take-home" money. It is everything you earned (Revenue) minus absolutely everything you spent (Cost of Goods + Transport + Salaries + Rent + Other Expenses). If this is negative, your business is losing money overall.`;
    }
    else if (query.includes("how") && query.includes("add a product")) {
        response = `To add a product, simply click the **Inventory** tab on the left. At the top, there is a Quick Add form where you can type the Name, Unit (like Bags or Pieces), Cost Price, and Selling Price. Click "+ Save" to add it!`;
    }
    // Deep Analytical
    else if (query.includes("most profitable") || query.includes("best product")) {
        const productPerf = {};
        state.sales.forEach(s => {
            s.items.forEach(i => {
                if(!productPerf[i.name]) productPerf[i.name] = { rev: 0, cogs: 0 };
                productPerf[i.name].rev += i.subtotalRev;
                productPerf[i.name].cogs += i.subtotalCOGS;
            });
        });
        let best = null, maxProfit = -1;
        for (const [name, data] of Object.entries(productPerf)) {
            const p = data.rev - data.cogs;
            if (p > maxProfit) { maxProfit = p; best = name; }
        }
        if (best) response = `Your most profitable product overall is **${best}**, generating a total gross profit of **${formatCurrency(maxProfit)}**.`;
        else response = "I couldn't find any sales data to determine profitability yet.";
    } 
    else if (query.includes("low stock")) {
        const lows = state.inventory.filter(i => i.stock <= (i.minStockAlert||0));
        if (lows.length > 0) response = `You have ${lows.length} items running low: ${lows.map(i=>`**${i.name}**`).join(', ')}. Restock soon!`;
        else response = "Good news! All your inventory items have healthy stock levels right now.";
    }
    else if (query.includes("biggest expense") || query.includes("largest expense")) {
        const expSums = {};
        state.expenses.forEach(e => {
            if(!expSums[e.category]) expSums[e.category] = 0;
            expSums[e.category] += e.amount;
        });
        let largest = null, maxExp = 0;
        for (const [cat, amt] of Object.entries(expSums)) {
            if (amt > maxExp) { maxExp = amt; largest = cat; }
        }
        if (largest) {
            response = `Your biggest expense category is **${largest}**, totaling **${formatCurrency(maxExp)}**.`;
        } else {
            response = "I couldn't find any recorded expenses to determine this.";
        }
    }
    else if (query.includes("much profit") || query.includes("total profit")) {
        let totalRev = 0, totalCOGS = 0, totalExp = 0;
        state.sales.forEach(s => { totalRev += s.totalRevenue; totalCOGS += s.totalCOGS; });
        state.expenses.forEach(e => { totalExp += e.amount; });
        const netProfit = (totalRev - totalCOGS) - totalExp;
        response = `You have made a Gross Profit of **${formatCurrency(totalRev - totalCOGS)}**. After all expenses, your Net Profit (take-home) is **${formatCurrency(netProfit)}**.`;
    }
    else {
        response = "I'm your FinIQ assistant! Try asking educational queries like:\n- 'What is COGS?'\n- 'What is Gross Profit?'\n\nOr data queries like:\n- 'What is my most profitable product?'\n- 'What is my biggest expense?'\n- 'How much profit have I made?'";
    }

    appendChatMessage(query, 'user');
    setTimeout(() => { appendChatMessage(response, 'ai'); }, 500);
}

const appendChatMessage = (text, sender) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
};

// Initialize app
init();
