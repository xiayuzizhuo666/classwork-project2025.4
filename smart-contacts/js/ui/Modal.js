/**
 * 模态框基类
 * 封装模态框的基本显示/隐藏功能
 */
 export class Modal {
  /**
   * 创建模态框实例
   * @param {string} modalId 模态框DOM元素ID
   */
  constructor(modalId) {
      this.modal = document.getElementById(modalId);
      if (!this.modal) {
          throw new Error(`未找到ID为${modalId}的模态框元素`);
      }
      this.initEvents();
  }

  /**
   * 初始化事件监听
   */
  initEvents() {
      // 点击模态框外部关闭
      this.modal.addEventListener('click', (e) => {
          if (e.target === this.modal) {
              this.close();
          }
      });
  }

  /**
   * 显示模态框
   */
  show() {
      // 先设置display，再添加show类以触发动画
      this.modal.style.display = 'flex'; // 修复为flex以匹配CSS布局
      // 强制重排，确保动画能正常触发
      this.modal.offsetHeight;
      this.modal.classList.add('show');
      document.body.style.overflow = 'hidden'; // 禁止背景滚动
  }

  /**
   * 隐藏模态框
   */
  close() {
      // 移除show类，触发淡出动画
      this.modal.classList.remove('show');
      
      // 等待动画完成后再隐藏
      setTimeout(() => {
          this.modal.style.display = 'none';
          document.body.style.overflow = ''; // 恢复背景滚动
      }, 300); // 与CSS动画时长保持一致
  }

  /**
   * 重置模态框内容(留给子类重写)
   */
  reset() {
      // 多态：基类空实现，子类可重写
  }
}