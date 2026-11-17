
const screens = ['signup', 'login', 'main'];
const DEFAULT_LOW_STOCK_THRESHOLD = 2;
const DEFAULT_EXPIRING_WINDOW_DAYS = 15;
const MAX_ITEM_PHOTO_BYTES = 2 * 1024 * 1024;
const ITEMS_STORAGE_KEY = 'casasyncItems';
const CATEGORIES_STORAGE_KEY = 'casasyncCategories';
let selectedCategory = '';
let editingItemId = '';
let selectedImageData = '';

function showScreen(id) {
    screens.forEach(s => {
        document.getElementById(s).classList.toggle('active', s === id);
    });
}

// GET REGISTERED USER
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('casasyncUser') || 'null');
    } catch {
        return null;
    }
}

// SIGN UP
document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const pass = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const msg = document.getElementById('signupMessage');

    // CHECK PASSWORD
    if (pass !== confirm) {
        msg.textContent = 'Passwords do not match.';
        return;
    }

    if (pass.length < 8) {
        msg.textContent = 'Password must be at least 8 characters.';
        return;
    }

    // SAVE USER
    const user = {
        name: name,
        email: email,
        password: pass
    };

    localStorage.setItem('casasyncUser', JSON.stringify(user));

    msg.textContent = '';

    // MOVE TO LOGIN SCREEN
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = '';

    showScreen('login');

    alert('Account created successfully! You can now log in.');
});


// LOG IN
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const user = getUser();

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    // CHECK ACCOUNT
    if (!user || user.email !== email || user.password !== pass) {
        msg.textContent = 'Incorrect email or password.';
        return;
    }

    // SUCCESSFUL LOGIN
    msg.textContent = '';

    document.getElementById('greetingName').textContent =
        'Hello, ' + user.name.split(' ')[0] + '!';

    document.getElementById('loginPassword').value = '';

    showScreen('main');
});


// OPEN CATEGORY MODAL
function openModal() {
    document.getElementById('categoryModal').classList.add('open');
    document.getElementById('categoryName').focus();
}

// CLOSE CATEGORY MODAL
function closeModal() {
    document.getElementById('categoryModal').classList.remove('open');
    document.getElementById('categoryForm').reset();
    updateCategoryPreview();
}

function getCustomCategories() {
    try {
        const categories = JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY) || '[]');
        if (Array.isArray(categories)) return categories;
        throw new Error('Saved categories have an invalid format.');
    } catch (error) {
        alert('Saved categories could not be loaded. Check your browser storage.');
        return [];
    }
}

function createCategoryCard(category) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'category custom-category';
    card.dataset.name = category.name;
    card.style.setProperty('--custom-category-color', category.color);

    const title = document.createElement('span');
    title.textContent = category.name.toUpperCase();
    const icon = document.createElement('span');
    icon.className = 'cat-icon';
    icon.textContent = category.icon;
    card.append(title, icon);
    return card;
}

function renderCustomCategories() {
    const grid = document.getElementById('allGrid');
    grid.querySelectorAll('.custom-category').forEach(card => card.remove());
    getCustomCategories().forEach(category => {
        const card = createCategoryCard(category);
        card.style.display = category.name.toLowerCase().includes(
            document.getElementById('searchInput').value.trim().toLowerCase()
        ) ? 'flex' : 'none';
        grid.appendChild(card);
    });
}

function updateCategoryPreview() {
    const name = document.getElementById('categoryName').value.trim();
    const icon = document.getElementById('categoryIcon').value;
    const color = document.getElementById('categoryColor').value;
    document.getElementById('categoryPreviewName').textContent = name ? name.toUpperCase() : 'CATEGORY';
    document.getElementById('categoryPreviewIcon').textContent = icon;
    document.getElementById('categoryPreview').style.setProperty('--custom-category-color', color);
}

function getItems() {
    try {
        const storedItems = JSON.parse(localStorage.getItem(ITEMS_STORAGE_KEY) || '{}');
        if (storedItems && typeof storedItems === 'object' && !Array.isArray(storedItems)) {
            return storedItems;
        }
        alert('Saved items have an invalid format and could not be loaded.');
        return {};
    } catch (error) {
        alert('Saved items could not be read. Please check your browser storage.');
        return {};
    }
}

function saveItems(items) {
    try {
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
        return true;
    } catch (error) {
        alert('Your item changes could not be saved. Check your browser storage and try again.');
        return false;
    }
}

function openCategoryItems(categoryName) {
    selectedCategory = categoryName;
    document.getElementById('categoryOverview').hidden = true;
    document.getElementById('itemView').hidden = false;
    document.getElementById('selectedCategoryName').textContent = categoryName;
    document.getElementById('pageTitle').textContent = categoryName.toUpperCase();
    document.querySelector('.search').hidden = true;
    renderItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToCategories() {
    selectedCategory = '';
    document.getElementById('itemView').hidden = true;
    document.getElementById('categoryOverview').hidden = false;
    document.getElementById('pageTitle').textContent = 'CATEGORIES';
    document.querySelector('.search').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getDaysUntilExpiration(dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const expiration = Date.UTC(year, month - 1, day);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((expiration - today) / 86400000);
}

function formatExpiration(dateValue) {
    return new Date(dateValue + 'T12:00:00').toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function renderItems() {
    const list = document.getElementById('itemList');
    const items = getItems()[selectedCategory] || [];
    list.replaceChildren();

    if (items.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-items';
        empty.textContent = 'No items in this category yet. Add an item to get started.';
        list.appendChild(empty);
        return;
    }

    items.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
    items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'item-card';

        const photo = document.createElement('div');
        photo.className = 'item-photo';
        if (item.photoData) {
            const image = document.createElement('img');
            image.src = item.photoData;
            image.alt = item.name;
            photo.appendChild(image);
        } else {
            photo.setAttribute('aria-label', 'Photo placeholder');
            photo.innerHTML = '<span aria-hidden="true">▧</span><small>PHOTO</small>';
        }

        const details = document.createElement('div');
        details.className = 'item-details';

        const name = document.createElement('h3');
        name.textContent = item.name;
        const quantity = document.createElement('p');
        quantity.innerHTML = '<strong>Quantity:</strong> ' + item.quantity;
        const expiration = document.createElement('p');
        expiration.innerHTML = '<strong>Expires:</strong> ' + formatExpiration(item.expirationDate);
        details.append(name, quantity, expiration);

        const statuses = document.createElement('div');
        statuses.className = 'item-statuses';
        const lowStockThreshold = Number.isInteger(item.lowStockThreshold)
            ? item.lowStockThreshold
            : DEFAULT_LOW_STOCK_THRESHOLD;
        if (item.quantity <= lowStockThreshold) {
            const badge = document.createElement('span');
            badge.className = 'status-badge low-stock-badge';
            const icon = document.createElement('img');
            icon.className = 'status-icon';
            icon.src = 'assets/icons/low_stocks.png';
            icon.alt = '';
            badge.append(icon, document.createTextNode('LOW STOCK'));
            statuses.appendChild(badge);
        }

        const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate);
        const expiringDays = Number.isInteger(item.expiringDays)
            ? item.expiringDays
            : DEFAULT_EXPIRING_WINDOW_DAYS;
        if (daysUntilExpiration <= expiringDays) {
            const badge = document.createElement('span');
            badge.className = 'status-badge expiring-badge';
            const label = daysUntilExpiration < 0 ? 'EXPIRED' : 'EXPIRING SOON';
            const icon = document.createElement('img');
            icon.className = 'status-icon';
            icon.src = 'assets/icons/expiring.png';
            icon.alt = '';
            badge.append(icon, document.createTextNode(label));
            statuses.appendChild(badge);
        }
        details.appendChild(statuses);

        const actions = document.createElement('div');
        actions.className = 'item-actions';
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.dataset.action = 'edit';
        editButton.dataset.itemId = item.id;
        editButton.textContent = 'Edit';
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-item';
        removeButton.dataset.action = 'remove';
        removeButton.dataset.itemId = item.id;
        removeButton.textContent = 'Remove';
        actions.append(editButton, removeButton);

        card.append(photo, details, actions);
        list.appendChild(card);
    });
}

function openItemModal(itemId) {
    const form = document.getElementById('itemForm');
    form.reset();
    editingItemId = itemId || '';
    selectedImageData = '';
    updateItemPhotoPreview();
    document.getElementById('itemModalTitle').textContent = editingItemId ? 'Edit item' : 'Add an item';

    if (editingItemId) {
        const item = (getItems()[selectedCategory] || []).find(entry => entry.id === editingItemId);
        if (!item) {
            alert('That item could not be found.');
            return;
        }
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemLowStockThreshold').value = Number.isInteger(item.lowStockThreshold)
            ? item.lowStockThreshold
            : DEFAULT_LOW_STOCK_THRESHOLD;
        document.getElementById('itemExpiration').value = item.expirationDate;
        document.getElementById('itemExpiringDays').value = Number.isInteger(item.expiringDays)
            ? item.expiringDays
            : DEFAULT_EXPIRING_WINDOW_DAYS;
        selectedImageData = item.photoData || '';
        updateItemPhotoPreview();
    }

    document.getElementById('itemModal').classList.add('open');
    document.getElementById('itemName').focus();
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('open');
    document.getElementById('itemForm').reset();
    editingItemId = '';
    selectedImageData = '';
    updateItemPhotoPreview();
}

function updateItemPhotoPreview() {
    const preview = document.getElementById('itemPhotoPreview');
    const placeholder = document.getElementById('itemPhotoPlaceholder');
    preview.hidden = !selectedImageData;
    placeholder.hidden = Boolean(selectedImageData);
    if (selectedImageData) {
        preview.src = selectedImageData;
    } else {
        preview.removeAttribute('src');
    }
}

document.getElementById('itemPhoto').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Choose a valid image file.');
        this.value = '';
        return;
    }
    if (file.size > MAX_ITEM_PHOTO_BYTES) {
        alert('The item photo must be 2 MB or smaller.');
        this.value = '';
        return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', function() {
        selectedImageData = reader.result;
        updateItemPhotoPreview();
    });
    reader.addEventListener('error', function() {
        alert('The item photo could not be read. Please choose another image.');
    });
    reader.readAsDataURL(file);
});

document.getElementById('itemForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    if (!name) {
        alert('Enter an item name.');
        return;
    }

    const quantity = Number(document.getElementById('itemQuantity').value);
    if (!Number.isInteger(quantity) || quantity < 0) {
        alert('Quantity must be a whole number greater than or equal to zero.');
        return;
    }

    const lowStockThreshold = Number(document.getElementById('itemLowStockThreshold').value);
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        alert('Low-stock threshold must be a whole number greater than or equal to zero.');
        return;
    }

    const expiringDays = Number(document.getElementById('itemExpiringDays').value);
    if (!Number.isInteger(expiringDays) || expiringDays < 0) {
        alert('Expiration alert days must be a whole number greater than or equal to zero.');
        return;
    }

    const items = getItems();
    const categoryItems = items[selectedCategory] || [];
    const itemData = {
        id: editingItemId || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
        name: name,
        quantity: quantity,
        lowStockThreshold: lowStockThreshold,
        expirationDate: document.getElementById('itemExpiration').value,
        expiringDays: expiringDays,
        photoData: selectedImageData
    };

    if (editingItemId) {
        const itemIndex = categoryItems.findIndex(item => item.id === editingItemId);
        if (itemIndex === -1) {
            alert('That item could not be found.');
            closeItemModal();
            return;
        }
        categoryItems[itemIndex] = itemData;
    } else {
        categoryItems.push(itemData);
    }

    items[selectedCategory] = categoryItems;
    if (saveItems(items)) {
        closeItemModal();
        renderItems();
    }
});

document.getElementById('itemList').addEventListener('click', function(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (button.dataset.action === 'edit') {
        openItemModal(button.dataset.itemId);
    } else if (button.dataset.action === 'remove' && confirm('Remove this item?')) {
        const items = getItems();
        items[selectedCategory] = (items[selectedCategory] || []).filter(item => item.id !== button.dataset.itemId);
        if (saveItems(items)) renderItems();
    }
});


document.getElementById('categoryForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const name = document.getElementById('categoryName').value.trim();
    const existingNames = [...document.querySelectorAll('#allGrid .category')]
        .map(card => card.dataset.name.toLowerCase());
    if (!name) {
        alert('Enter a category name.');
        return;
    }
    if (existingNames.includes(name.toLowerCase())) {
        alert('A category with this name already exists.');
        return;
    }

    const categories = getCustomCategories();
    categories.push({
        name: name,
        icon: document.getElementById('categoryIcon').value,
        color: document.getElementById('categoryColor').value
    });
    try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
        alert('Your category could not be saved. Check your browser storage and try again.');
        return;
    }

    renderCustomCategories();
    closeModal();
});

document.getElementById('categoryName').addEventListener('input', updateCategoryPreview);
document.getElementById('categoryIcon').addEventListener('change', updateCategoryPreview);
document.getElementById('categoryColor').addEventListener('input', updateCategoryPreview);


// SEARCH CATEGORIES
document.getElementById('searchInput').addEventListener('input', function(e) {
    const q = e.target.value.toLowerCase();

    document.querySelectorAll('#allGrid .category').forEach(card => {
        card.style.display = card.dataset.name.toLowerCase().includes(q)
            ? 'flex'
            : 'none';
    });
});

renderCustomCategories();


// CLOSE MODAL WHEN CLICKING OUTSIDE
document.getElementById('categoryModal').addEventListener('click', function(e) {
    if (e.target.id === 'categoryModal') {
        closeModal();
    }
});

document.getElementById('itemModal').addEventListener('click', function(e) {
    if (e.target.id === 'itemModal') {
        closeItemModal();
    }
});


function showMenu() {
    const menu = document.getElementById('navigationMenu');
    const button = document.querySelector('.hamburger');
    const isOpen = !menu.hidden;

    menu.hidden = isOpen;
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
}

function closeMenu() {
    document.getElementById('navigationMenu').hidden = true;
    const button = document.querySelector('.hamburger');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open menu');
}

function goToCategories() {
    closeMenu();
    document.getElementById('inventoryHome').hidden = true;
    document.getElementById('categoriesPage').hidden = false;
    document.getElementById('categoryOverview').hidden = false;
    document.getElementById('itemView').hidden = true;
    document.querySelector('.search').hidden = false;
    document.getElementById('pageTitle').textContent = 'CATEGORIES';
    document.getElementById('categoriesPage').scrollIntoView({ behavior: 'smooth' });
}

function goToInventory() {
    closeMenu();
    document.getElementById('categoriesPage').hidden = true;
    document.getElementById('inventoryHome').hidden = false;
    document.querySelector('.search').hidden = false;
    document.getElementById('pageTitle').textContent = 'INVENTORY';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function logOut() {
    closeMenu();
    if (confirm('Log out of CasaSync?')) {
        showScreen('login');
    }
}

document.addEventListener('click', function(e) {
    const category = e.target.closest('.category[data-name]');
    if (category) {
        openCategoryItems(category.dataset.name);
    }

    const menu = document.getElementById('navigationMenu');
    if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('.hamburger')) {
        closeMenu();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMenu();
        closeItemModal();
    }
});
