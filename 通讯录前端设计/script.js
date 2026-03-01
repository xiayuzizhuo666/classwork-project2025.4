let currentContactId = null;
let contacts = JSON.parse(localStorage.getItem('contacts')) || [];

// 页面导航
function navigate(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if(pageId === 'contacts') renderContacts();
}

// 渲染联系人
function renderContacts(filter = 'all', search = '') {
    const container = document.getElementById('contactList');
    let filtered = contacts.filter(c => {
        const matchCategory = filter === 'all' || c.category === filter;
        const matchSearch = c.name.includes(search) || c.phone.includes(search);
        return matchCategory && matchSearch;
    });

    container.innerHTML = filtered.map(c => `
        <div class="contact-card card">
            <h4>${c.name}</h4>
            <p>📞 ${c.phone}</p>
            <p>🏢 ${c.address}</p>
            <p>🏷️ ${c.category}</p>
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="editContact('${c.id}')">编辑</button>
                <button class="btn btn-danger" onclick="deleteContact('${c.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

// 联系人操作
function showAddModal() {
    currentContactId = null;
    document.getElementById('contactModal').style.display = 'flex';
    document.getElementById('contactForm').reset();
}

function editContact(id) {
    const contact = contacts.find(c => c.id === id);
    if(contact) {
        currentContactId = id;
        document.getElementById('name').value = contact.name;
        document.getElementById('phone').value = contact.phone;
        document.getElementById('address').value = contact.address;
        document.getElementById('category').value = contact.category;
        document.getElementById('contactModal').style.display = 'flex';
    }
}

function saveContact(e) {
    e.preventDefault();
    const contact = {
        id: currentContactId || Date.now().toString(),
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        category: document.getElementById('category').value
    };

    // 检查重复
    const exists = contacts.some(c => 
        c.name === contact.name && 
        c.category === contact.category && 
        c.id !== contact.id
    );
    
    if(exists) return alert('该类别下已存在同名联系人！');

    if(currentContactId) {
        // 更新
        const index = contacts.findIndex(c => c.id === currentContactId);
        contacts[index] = contact;
    } else {
        // 新增
        contacts.push(contact);
    }

    saveToLocal();
    closeModal();
    renderContacts();
}

function deleteContact(id) {
    if(confirm('确定要删除该联系人吗？')) {
        contacts = contacts.filter(c => c.id !== id);
        saveToLocal();
        renderContacts();
    }
}

// 工具函数
function filterContacts(category) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderContacts(category);
}

function searchContacts(query) {
    renderContacts(document.querySelector('.tab-btn.active').textContent, query);
}

function closeModal() {
    document.getElementById('contactModal').style.display = 'none';
}

function saveToLocal() {
    localStorage.setItem('contacts', JSON.stringify(contacts));
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(link.getAttribute('href').substring(1));
        });
    });
    navigate('home');
});