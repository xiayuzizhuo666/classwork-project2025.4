/**
 * 联系人数据模型类
 * 封装联系人基本属性与方法
 */
 export class Contact {
  /**
   * 创建联系人实例
   * @param {Object} options 联系人信息
   * @param {string} options.name 姓名
   * @param {string} options.phone 电话
   * @param {string} options.address 单位/地址
   * @param {string} options.category 类别(办公/个人)
   * @param {string} [options.id] 唯一标识(自动生成)
   */
  constructor(options) {
      this.id = options.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      this.name = options.name;
      this.phone = options.phone;
      this.address = options.address;
      this.category = options.category;
      this.createdAt = new Date();
  }

  /**
   * 格式化电话号码显示
   * @returns {string} 格式化后的号码
   */
  formatPhone() {
      // 简单格式化示例：11位手机号添加分隔符
      if (/^\d{11}$/.test(this.phone)) {
          return this.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      }
      return this.phone;
  }

  /**
   * 转换为普通对象(用于本地存储)
   * @returns {Object} 序列化后的联系人数据
   */
  toJSON() {
      return {
          id: this.id,
          name: this.name,
          phone: this.phone,
          address: this.address,
          category: this.category,
          createdAt: this.createdAt.toISOString()
      };
  }
}