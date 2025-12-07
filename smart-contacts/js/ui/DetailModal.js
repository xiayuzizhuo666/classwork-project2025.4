import { Modal } from './Modal.js';

/**
 * 联系人详情模态框
 * 继承自Modal基类，显示联系人详情，支持编辑和删除操作
 */
export class DetailModal extends Modal {
    constructor(contactManager, addModal) {
        super('detailModal');
        // 缓存DOM元素
        this.detailElements = {
            name: document.getElementById('detailName'),
            phone: document.getElementById('detailPhone'),
            address: document.getElementById('detailAddress'),
            category: document.getElementById('detailCategory')
        };
        this.currentContact = null;
        this.contactManager = contactManager;
        this.addModal = addModal;
        this.initCopyFunction();
        this.initEditButton();
    }

    /**
     * 格式化电话号码为 138-8765-4321 格式
     * @param {string} phone 原始电话号码
     * @returns {string} 格式化后的电话号码
     */
    formatPhoneNumber(phone) {
        // 移除非数字字符
        const cleaned = phone.replace(/\D/g, '');
        
        // 检查是否是11位手机号码
        if (cleaned.length === 11) {
            // 格式化为 xxx-xxxx-xxxx
            return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
        }
        
        // 对于非11位号码，返回原始号码
        return phone;
    }

    /**
     * 初始化复制电话号码功能
     */
    initCopyFunction() {
        const copyButton = document.querySelector('.btn-icon');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                this.copyPhoneNumber();
            });
        }
    }

    /**
     * 初始化编辑功能
     */
    initEditButton() {
        // 编辑按钮的点击事件由HTML中的onclick直接调用editCurrentContact
    }

    /**
     * 编辑当前联系人
     */
    editCurrentContact() {
        if (!this.currentContact) {
            alert('没有选中的联系人');
            return;
        }
        
        // 调用添加模态框的编辑方法
        this.addModal.editContact(this.currentContact);
        
        // 关闭详情模态框
        this.close();
    }

    /**
     * 显示联系人详情
     * @param {Contact} contact 联系人实例
     */
    showContact(contact) {
        this.currentContact = contact;
        this.detailElements.name.textContent = contact.name;
        
        // 使用类内格式化方法
        const formattedPhone = this.formatPhoneNumber(contact.phone);
        this.detailElements.phone.textContent = formattedPhone;
        
        this.detailElements.address.textContent = contact.address || '未提供';
        this.detailElements.category.textContent = contact.category;
        super.show();
    }

    /**
     * 复制电话号码到剪贴板
     */
    async copyPhoneNumber() {
        if (!this.currentContact) return;
        
        try {
            // 使用现代的 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                // 复制未格式化的电话号码（纯数字）
                const cleanedPhone = this.currentContact.phone.replace(/\D/g, '');
                await navigator.clipboard.writeText(cleanedPhone);
                this.showCopySuccess();
            } else {
                // 回退到传统方法
                this.fallbackCopyText(this.currentContact.phone.replace(/\D/g, ''));
            }
        } catch (err) {
            console.error('复制电话号码失败:', err);
            // 如果现代API失败，尝试传统方法
            this.fallbackCopyText(this.currentContact.phone.replace(/\D/g, ''));
        }
    }

    /**
     * 传统的文本复制方法（作为回退）
     * @param {string} text 要复制的文本
     */
    fallbackCopyText(text) {
        try {
            // 创建临时元素用于复制
            const tempElement = document.createElement('textarea');
            tempElement.value = text;
            tempElement.style.position = 'absolute';
            tempElement.style.left = '-999999px';
            tempElement.style.top = '-999999px';
            document.body.appendChild(tempElement);
            
            // 选择并复制文本
            tempElement.focus();
            tempElement.select();
            const successful = document.execCommand('copy');
            
            // 移除临时元素
            document.body.removeChild(tempElement);
            
            if (successful) {
                this.showCopySuccess();
            } else {
                throw new Error('execCommand copy failed');
            }
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制电话号码');
        }
    }

    /**
     * 显示复制成功提示
     */
    showCopySuccess() {
        // 创建一个临时的提示元素
        const toast = document.createElement('div');
        toast.textContent = '电话号码已复制';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4caf50;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-size: 14px;
        `;
        
        document.body.appendChild(toast);
        
        // 2秒后移除提示
        setTimeout(() => {
            // 添加淡出动画
            toast.style.transition = 'opacity 0.5s ease-out';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 2000);
    }

    /**
     * 删除当前联系人
     */
    async deleteCurrentContact() {
        if (!this.currentContact) {
            alert('没有选中的联系人');
            return;
        }

        // 确认删除
        const confirmed = confirm(`确定要删除联系人 "${this.currentContact.name}" 吗？此操作无法撤销。`);
        if (!confirmed) {
            return;
        }

        try {
            // 执行删除
            const result = await this.contactManager.deleteContact(this.currentContact.id);
            
            if (result.success) {
                // 删除成功，关闭模态框
                alert(`成功删除联系人 "${result.contact.name}"`);
                this.close();
            } else {
                // 删除失败
                alert(`删除失败：${result.error}`);
            }
        } catch (error) {
            console.error('删除联系人失败:', error);
            alert('删除失败，请重试');
        }
    }

    /**
     * 重写关闭方法：清空当前联系人缓存
     */
    close() {
        this.currentContact = null;
        super.close();
    }
}