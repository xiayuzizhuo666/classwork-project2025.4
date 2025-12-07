/**
 * 联系人列表UI渲染类
 * 负责联系人列表的展示与交互
 */
 export class ContactList {
  /**
   * 创建联系人列表实例
   * @param {ContactManager} contactManager 联系人管理器实例
   * @param {DetailModal} detailModal 详情模态框实例
   */
  constructor(contactManager, detailModal) {
      this.contactManager = contactManager;
      this.detailModal = detailModal;
      this.container = document.getElementById('contactList');
      this.currentCategory = 'all';
      this.currentKeyword = '';
      this.currentSortOrder = 'desc'; // 默认按创建时间降序排序
      this.initEvents();
  }

  /**
     * 初始化分类筛选事件
     */
    initEvents() {
        // 分类标签点击事件委托
        document.querySelector('.category-tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                // 更新活跃状态
                document.querySelectorAll('.tab-btn').forEach(btn => 
                    btn.classList.remove('active')
                );
                e.target.classList.add('active');
                // 筛选联系人
                this.currentCategory = e.target.dataset.category;
                this.render();
            }
        });

        // 搜索框事件 - 添加防抖处理
        const searchInput = document.querySelector('.search-box input');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            
            // 清除之前的定时器
            clearTimeout(searchTimeout);
            
            // 设置新的定时器，300ms后执行搜索
            searchTimeout = setTimeout(() => {
                this.currentKeyword = value;
                this.render();
            }, 300);
        });
        
        // 排序选项变化事件
        const sortSelect = document.getElementById('sortOrder');
        sortSelect.addEventListener('change', (e) => {
            this.currentSortOrder = e.target.value;
            this.render();
        });
    }

  /**
     * 渲染联系人列表
     */
    render() {
        let filteredContacts = this.contactManager.filterContacts(
            this.currentCategory,
            this.currentKeyword
        );

        // 根据创建时间排序
        filteredContacts.sort((a, b) => {
            const dateA = a.createdAt.getTime();
            const dateB = b.createdAt.getTime();
            return this.currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        // 根据当前筛选条件显示适当的空状态提示
        if (filteredContacts.length === 0) {
            let emptyMessage;
            if (this.currentKeyword) {
                emptyMessage = `<p class="empty-message">未找到包含"${this.currentKeyword}"的联系人</p>`;
            } else if (this.currentCategory !== 'all') {
                emptyMessage = `<p class="empty-message">未找到${this.currentCategory}类别的联系人</p>`;
            } else {
                emptyMessage = '<p class="empty-message">暂无联系人数据</p>';
            }
            this.container.innerHTML = emptyMessage;
            return;
        }

        // 生成联系人卡片HTML
        this.container.innerHTML = filteredContacts.map(contact => `
            <div class="contact-card" data-id="${contact.id}">
                <h3>${contact.name}</h3>
                <p class="phone">${contact.formatPhone()}</p>
                <p class="address">${contact.address}</p>
                <span class="category-tag ${contact.category}">${contact.category}</span>
            </div>
        `).join('');

        // 绑定卡片点击事件(查看详情)
        this.container.querySelectorAll('.contact-card').forEach(card => {
            card.addEventListener('click', () => {
                const contact = this.contactManager.getContactById(card.dataset.id);
                if (contact) {
                    this.detailModal.showContact(contact);
                }
            });
        });
    }
}