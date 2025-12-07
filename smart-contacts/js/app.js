import { ContactManager } from './core/ContactManager.js';
import { AddContactModal } from './ui/AddContactModal.js';
import { DetailModal } from './ui/DetailModal.js';
import { ContactList } from './ui/ContactList.js';

/**
 * 应用主控制器
 * 协调各模块初始化与交互
 */
class App {
    constructor() {
        // 初始化核心模块
        this.contactManager = new ContactManager();
        
        // 初始化UI组件
        this.initModals();
        this.initContactList();
        this.initNavigation();
        
        // 数据变化时重新渲染列表
        this.contactManager.addListener(() => {
            this.contactList.render();
        });
        
        // 确保数据加载完成后再渲染列表
        this.ensureDataLoaded();
    }
    
    /**
     * 确保数据加载完成
     */
    async ensureDataLoaded() {
        // 由于loadFromStorage是异步的，我们需要确保它完成后再渲染
        await this.contactManager.loadFromStorage();
        this.contactList.render();
    }

    /**
     * 初始化模态框
     */
    initModals() {
        // 添加/编辑联系人模态框(传入保存和更新回调)
        this.addModal = new AddContactModal(
            (contactData) => this.contactManager.addContact(contactData),
            (id, contactData) => this.contactManager.updateContact(id, contactData)
        );
        
        // 详情模态框(传入联系人管理器和添加模态框引用)
        this.detailModal = new DetailModal(this.contactManager, this.addModal);
    }

    /**
     * 初始化联系人列表
     */
    initContactList() {
        this.contactList = new ContactList(
            this.contactManager,
            this.detailModal
        );
        this.contactList.render();
    }

    /**
     * 初始化页面导航
     */
    initNavigation() {
        // 导航链接点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.navigate(targetId);
            });
        });

        // 首页"浏览通讯录"按钮
        const contactsButton = document.querySelector('button[onclick="navigate(\'contacts\')"]');
        if (contactsButton) {
            contactsButton.addEventListener('click', () => this.navigate('contacts'));
        }

        // 全局暴露导航方法(供HTML中调用)
        // 使用箭头函数确保this绑定正确
        window.navigate = (targetId) => this.navigate(targetId);
        window.showAddModal = () => this.addModal.show();
        window.closeModal = () => this.addModal.close();
        window.closeDetailModal = () => this.detailModal.close();
        window.deleteCurrentContact = () => this.detailModal.deleteCurrentContact();
        window.editCurrentContact = () => this.detailModal.editCurrentContact();
        
        // 导出功能
        window.exportAllContacts = () => {
            this.contactManager.exportToCSV('all');
        };
        
        window.exportCurrentCategory = () => {
            if (this.contactList) {
                this.contactManager.exportToCSV(this.contactList.currentCategory);
            }
        };
        
        window.clearAllContacts = () => {
            const confirmed = confirm('确定要清空所有联系人吗？此操作无法撤销！');
            if (confirmed) {
                // 清空本地存储
                localStorage.removeItem('contacts');
                // 刷新页面重新加载
                location.reload();
            }
        };
    }

    /**
     * 页面导航切换
     * @param {string} targetId 目标页面ID
     */
    navigate(targetId) {
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = page.id === targetId ? 'block' : 'none';
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new App();
});