import { Modal } from './Modal.js';

/**
 * 添加/编辑联系人模态框
 * 继承自Modal基类，实现表单提交功能，支持添加和编辑模式
 */
export class AddContactModal extends Modal {
    /**
     * 创建添加/编辑联系人模态框实例
     * @param {Function} onSave 保存联系人的回调函数
     * @param {Function} onUpdate 更新联系人的回调函数
     */
    constructor(onSave, onUpdate) {
        super('contactModal');
        this.form = document.getElementById('contactForm');
        this.onSave = onSave;
        this.onUpdate = onUpdate;
        this.editingContactId = null;
        this.initForm();
    }

    /**
     * 初始化表单提交事件
     */
    initForm() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    /**
     * 编辑联系人
     * @param {Contact} contact 要编辑的联系人对象
     */
    editContact(contact) {
        this.editingContactId = contact.id;
        
        // 预填充表单
        document.getElementById('name').value = contact.name;
        document.getElementById('phone').value = contact.phone;
        document.getElementById('address').value = contact.address;
        document.getElementById('category').value = contact.category;
        
        // 修改模态框标题
        document.querySelector('#contactModal .modal-title').textContent = '编辑联系人';
        
        // 显示模态框
        this.show();
    }

    /**
     * 处理表单提交
     */
    async handleSubmit() {
        const contactData = {
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            category: document.getElementById('category').value
        };

        // 验证表单数据
        if (!this.validateForm(contactData)) {
            return;
        }

        let result;
        
        try {
            // 根据模式调用不同的回调
            if (this.editingContactId) {
                // 编辑模式
                result = await this.onUpdate(this.editingContactId, contactData);
            } else {
                // 添加模式
                result = await this.onSave(contactData);
            }
            
            // 检查回调结果是否有效
            if (!result || typeof result !== 'object') {
                console.warn('回调返回了无效的结果:', result);
                this.showError('操作失败，请重试');
                return;
            }
            
            if (result.success) {
                this.close();
            } else {
                // 显示错误提示
                this.showError(result.error || '操作失败，请重试');
            }
        } catch (error) {
            console.error('表单提交失败:', error);
            this.showError('操作失败，请重试');
        }
    }

    /**
     * 验证表单数据
     * @param {Object} contactData 联系人数据
     * @returns {boolean} 验证是否通过
     */
    validateForm(contactData) {
        // 检查必填字段
        if (!contactData.name || !contactData.phone || !contactData.address) {
            this.showError('请填写所有必填字段');
            return false;
        }
        
        // 简单的手机号验证(可选) - 放宽验证条件
        if (contactData.phone.length === 11 && !/^1\d{10}$/.test(contactData.phone)) {
            this.showError('请输入有效的11位手机号码');
            return false;
        }
        
        // 至少7位数字的简单验证
        if (!/^\d{7,}$/.test(contactData.phone)) {
            this.showError('电话号码至少需要7位数字');
            return false;
        }
        
        return true;
    }

    /**
     * 显示错误提示
     * @param {string} message 错误信息
     */
    showError(message) {
        // 检查是否已有错误提示元素
        let errorElement = this.form.querySelector('.error-message');
        
        if (!errorElement) {
            // 创建错误提示元素
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            // 插入到表单内部的顶部
            this.form.insertBefore(errorElement, this.form.firstChild);
        }
        
        // 设置错误信息并显示
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // 5秒后自动隐藏错误提示
        setTimeout(() => {
            if (errorElement && errorElement.parentNode === this.form) {
                errorElement.style.display = 'none';
            }
        }, 5000);
    }

    /**
     * 重写重置方法：清空表单和编辑状态
     */
    reset() {
        this.form.reset();
        this.editingContactId = null;
        // 重置模态框标题
        document.querySelector('#contactModal .modal-title').textContent = '添加联系人';
        // 清空错误信息
        const errorElement = this.form.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = '';
        }
    }

    /**
     * 重写显示方法：显示前重置表单
     */
    show() {
        this.reset();
        super.show();
    }
}